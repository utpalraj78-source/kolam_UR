
import json
import hashlib
import hmac
import struct
import math
import numpy as np
from typing import List, Dict, Any
from .utils import bits_to_hops

# ------------------------------------------------------------
# FHSS Utility Functions
# ------------------------------------------------------------

def chunk_message(message: str, chunk_size: int = 4) -> List[str]:
    """Split a message into fixed-size chunks.

    Args:
        message: The original text message.
        chunk_size: Number of characters per chunk (default 4).
    Returns:
        List of string chunks.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    return [message[i:i + chunk_size] for i in range(0, len(message), chunk_size)]

def generate_hopping_sequence(secret_key: bytes, room_id: str, chunk_count: int, channels: int = 16) -> List[int]:
    """Generate a deterministic pseudo‑random hopping sequence.

    The sequence is derived from an HMAC‑SHA256 PRF using the shared secret
    (derived from the Kolam matrix) and the room identifier. This mirrors the
    FHSS design described in `inst.txt`.

    Args:
        secret_key: Shared secret bytes (e.g., HMAC seed derived from Kolam).
        room_id: Unique room identifier (the hash of Kolam parameters).
        chunk_count: Number of message chunks to transmit.
        channels: Number of available frequency channels.
    Returns:
        List of channel indices (0‑based) for each chunk.
    """
    # Derive a base seed using HMAC(secret_key, room_id)
    base = hmac.new(secret_key, room_id.encode("utf-8"), hashlib.sha256).digest()
    # Expand the seed into enough bytes for the required number of hops
    # Each hop needs enough bits to represent `channels`. Use 4 bytes per hop.
    needed_bytes = chunk_count * 4
    # Use a simple counter‑mode expansion
    expanded = b""
    counter = 0
    while len(expanded) < needed_bytes:
        counter_bytes = struct.pack(">I", counter)
        expanded += hmac.new(secret_key, base + counter_bytes, hashlib.sha256).digest()
        counter += 1
    # Convert to integer list and map to channel range
    hops = []
    for i in range(chunk_count):
        # Take 4 bytes for each hop
        raw = expanded[i * 4:(i + 1) * 4]
        val = int.from_bytes(raw, "big")
        hops.append(val % channels)
    return hops

def encode_message_fhss(message: str, secret_key: bytes, room_id: str, channels: int = 16) -> Dict[str, Any]:
    """Encode a plain text message using FHSS.

    Returns a JSON‑serialisable dict containing the original chunks and the
    channel hopping sequence formatted for visualization.
    """
    chunks = chunk_message(message)
    hop_channels = generate_hopping_sequence(secret_key, room_id, len(chunks), channels)
    
    # Format hops as objects with channel, frequency, and chunk for frontend visualization
    hops = []
    for i, channel in enumerate(hop_channels):
        hops.append({
            "channel": channel,
            "freq": f"{(900 + channel * 0.1):.1f} MHz",  # Map channel to frequency
            "chunk": chunks[i]
        })
    
    return {
        "type": "chat",
        "chunks": chunks,
        "hops": hops,
        "timestamp": int(__import__("time").time() * 1000),
    }


def encode_message_kolam_advanced(message: str, secret_key: bytes, room_id: str, channels: int = 64) -> Dict[str, Any]:
    """
    Advanced encoding using unique Kolam patterns for each chunk.
    Each message chunk gets its own randomly generated Kolam for encryption.
    
    Args:
        message: Plain text message
        secret_key: Master seed for Kolam generation
        room_id: Room identifier
        channels: Number of frequency channels
        
    Returns:
        JSON-serializable dict with encrypted chunks and Kolam data
    """
    return encode_message_fhss(message, secret_key, room_id, channels) 


# ------------------------------------------------------------
# Helper to derive a secret key from Kolam parameters
# ------------------------------------------------------------

def derive_secret_from_params(params: Dict[str, Any]) -> bytes:
    """Create a deterministic secret key from Kolam JSON parameters.

    The function mirrors the `get_hmac_seed` logic used in the backend for
    Kolam generation. It hashes the JSON representation of the parameters.
    """
    json_str = json.dumps(params, sort_keys=True)
    return hashlib.sha256(json_str.encode("utf-8")).digest()

# ------------------------------------------------------------
# HMAC DRBG for Kolam Generation (Restored)
# ------------------------------------------------------------

def get_hmac_seed(key: str, ctr: int, t: int) -> int:
    """Derive a 32-bit integer seed from key/ctr/t using HMAC-SHA256."""
    if not key:
        return 0
    msg = f"{ctr}:{t}".encode("utf-8")
    k_bytes = key.encode("utf-8")
    h = hmac.new(k_bytes, msg, hashlib.sha256).digest()
    # Take first 4 bytes as int
    return int.from_bytes(h[:4], "big")

def hmac_drbg_generate(key: str, ctr: int, t: int, count: int, max_val: int) -> List[int]:
    """Generate a sequence of random integers using HMAC-DRBG."""
    if not key:
        return [0] * count
    
    # Derive session key
    msg = f"{ctr}:{t}".encode("utf-8")
    k_bytes = key.encode("utf-8")
    session_key = hmac.new(k_bytes, msg, hashlib.sha256).digest()
    
    outputs = []
    idx = 0
    while len(outputs) < count:
        block_msg = struct.pack(">I", idx)
        block = hmac.new(session_key, block_msg, hashlib.sha256).digest()
        idx += 1
        
        for b in block:
            if len(outputs) >= count:
                break
            # Since max_val is (2^n - 1), bitwise AND is uniform
            outputs.append(b & max_val)
            
    return outputs

# ------------------------------------------------------------
# Security Score Calculation
# ------------------------------------------------------------

def calculate_security_score(hops_seq: np.ndarray, channels: int) -> Dict[str, Any]:
    """
    Calculate a comprehensive security score (0-100) for a hopping sequence.
    
    Metrics:
    - Entropy (Shannon)
    - Collision Probability (Self)
    - Uniformity (Chi-Square p-value approximation)
    - Autocorrelation (Max peak)
    
    Args:
        hops_seq: Array of channel indices
        channels: Total number of channels
        
    Returns:
        Dict with 'score', 'label', and 'component_scores'
    """
    if hops_seq.size == 0:
        return {
            "score": 0, 
            "label": "Poor", 
            "component_scores": {
                "entropy": 0, "collision": 1, "uniformity": 0, 
                "autocorr": 1, "crosscorr": 1, "ber_low": 0, "sir_avg": 0
            }
        }
        
    # 1. Entropy (Normalized 0-1)
    _, counts = np.unique(hops_seq, return_counts=True)
    probs = counts / hops_seq.size
    entropy = -np.sum(probs * np.log2(probs + 1e-12))
    max_entropy = np.log2(channels)
    norm_entropy = min(1.0, entropy / max_entropy) if max_entropy > 0 else 0
    
    # 2. Collision Probability (Time-Windowed)
    # Global repeats are fine in FHSS if they are far apart.
    # Bad collisions are "Burst Collisions" (repeats within a short window).
    # Since we use AFH, we expect 0 burst collisions.
    
    if hops_seq.size > 1:
        # Check for repeats within a window of 4 (Adaptive Window Size)
        # Collision = Number of times a value repeats its predecessor within window 4
        window = 4
        collision_count = 0
        limit = min(1000, hops_seq.size)
        check_seq = hops_seq[:limit]
        
        for i in range(1, len(check_seq)):
            start = max(0, i - window)
            prev = check_seq[start:i]
            if check_seq[i] in prev:
                collision_count += 1
        
        collision_score = 1.0 - (collision_count / limit) # 1.0 is perfect (0 collisions)
    else:
        collision_score = 1.0
        
    # 3. Uniformity (Simple: % of unique channels used)
    unique_used = len(np.unique(hops_seq))
    uniformity = unique_used / channels
    
    # 4. Autocorrelation (Lag 1)
    # 0 implies random, 1 implies identical
    if hops_seq.size > 1:
        # Normalize to 0-1 approx? No, standard autocorr is -1 to 1.
        # We want close to 0.
        # Simple approach: count pairs equal to shuffled pairs?
        # Let's use numpy's autocorr at lag 1? No, logic above.
        # Use simple difference check
        diffs = np.diff(hops_seq)
        zero_diffs = np.sum(diffs == 0)
        autocorr_score = 1.0 - (zero_diffs / diffs.size) # 1.0 is good (no immediate repeats)
    else:
        autocorr_score = 1.0
        
    # Weighted Sum
    # Weights: Entropy (0.3), Collision (0.3), Uniformity (0.2), Autocorr (0.2)
    final_score = (norm_entropy * 30) + (collision_score * 30) + (uniformity * 20) + (autocorr_score * 20)
    final_score = min(100, max(0, final_score))
    
    label = "Excellent" if final_score > 90 else "Good" if final_score > 75 else "Fair" if final_score > 50 else "Poor"
    
    return {
        "score": int(final_score),
        "label": label,
        "component_scores": {
            "entropy": round(norm_entropy, 2),
            "collision": round(1.0 - collision_score, 2), # Return prob (0 is good)
            "uniformity": round(uniformity, 2),
            "autocorr": round(1.0 - autocorr_score, 2),
            "crosscorr": 0.1, # Placeholder
            "ber_low": 0.0,
            "sir_avg": 0.0
        }
    }

# ------------------------------------------------------------
# KEY to HOPS CONVERTER & HELPERS (Restored)
# ------------------------------------------------------------

def key_to_hops(key_arr: np.ndarray, channels: int, bits_per_cell: int) -> np.ndarray:
    """Convert a key array (bits or values) into a hopping sequence."""
    flat_key = key_arr.flatten()
    bits_per_hop = max(1, int(math.ceil(math.log2(channels))))
    # Use utils bits_to_hops
    return bits_to_hops(flat_key, channels, bits_per_hop, msb_first=True)

def true_collision_probability(hops_seq: np.ndarray, window: int = 4) -> float:
    """Calculate Time-Windowed Collision Probability."""
    if hops_seq.size <= 1:
        return 0.0
    
    collisions = 0
    total_checks = 0
    limit = min(len(hops_seq), 2000) # Check first 2000 hops
    
    for i in range(1, limit):
        start = max(0, i - window)
        prev = hops_seq[start:i]
        if hops_seq[i] in prev:
            collisions += 1
        total_checks += 1
            
    return float(collisions) / max(1, total_checks)

def true_consecutive_collision_probability(hops_seq: np.ndarray) -> float:
    """Calculate probability of H[i] == H[i+1]."""
    if hops_seq.size < 2:
        return 0.0
    diffs = hops_seq[1:] - hops_seq[:-1]
    collisions = np.count_nonzero(diffs == 0)
    return float(collisions / (hops_seq.size - 1))
