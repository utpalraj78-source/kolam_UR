"""
Kolam Message Encoder - Advanced FHSS Encryption System
This module implements a unique encryption scheme where each message chunk
is assigned its own randomly generated Kolam pattern for encryption.
"""

import json
import hashlib
import hmac
import numpy as np
from typing import List, Dict, Any, Tuple
from .kolam_generator import generate_kolam, build_combined_matrix
from .utils import M_to_nibble_matrix, nibble_matrix_to_bits, bits_to_hops
from .telecom_logic import (
    fh_ofdma_encode_pipeline, fh_ofdma_decode_pipeline, 
    calculate_cqi, HARQBuffer
)
import random
import time


class KolamMessageEncoder:
    """
    Encodes messages using Kolam FH-OFDMA.
    Multiple sub-carriers are used in parallel, with patterns derived from Kolam.
    """
    
    def __init__(
        self, 
        master_seed: str = None,
        channels: int = 64,
        chunk_size: int = 16,
        symmetries: List[str] = None
    ):
        self.master_seed = master_seed or str(time.time())
        self.channels = channels
        self.chunk_size = chunk_size
        self.harq_buffer = HARQBuffer()
        
        self.symmetries = symmetries or [
            "radial", "diagonal", "square", "180 degree", 
            "90 degree", "vertical", "horizontal", "random"
        ]
        
    def _generate_chunk_seed(self, chunk_index: int, chunk_content: str) -> int:
        data = f"{self.master_seed}:{chunk_index}:{chunk_content}"
        hash_bytes = hashlib.sha256(data.encode()).digest()
        return int.from_bytes(hash_bytes[:4], 'big')
    
    def chunk_message(self, message: str) -> List[str]:
        chunks = []
        for i in range(0, len(message), self.chunk_size):
            chunk = message[i:i + self.chunk_size]
            if len(chunk) < self.chunk_size and i + self.chunk_size > len(message):
                chunk = chunk.ljust(self.chunk_size, '\x00')
            chunks.append(chunk)
        return chunks
    
    def generate_kolam_for_chunk(self, chunk_index: int, chunk_content: str) -> Tuple[np.ndarray, Dict[str, Any], str]:
        seed = self._generate_chunk_seed(chunk_index, chunk_content)
        rng = random.Random(seed)
        symmetry = rng.choice(self.symmetries)
        k = rng.choice([7, 9, 11, 13])
        randomness = rng.randint(2, 8)
        layout = rng.choice(["Square grid (no rotate)", "Diamond (rotate 45)"])

        M, _, _, _, img_b64, _ = generate_kolam(
            symmetry=symmetry, m=randomness, k=k, seed=seed, analyze=True, return_preview=True, layout=layout
        )
        params = {"symmetry": symmetry, "k": k, "seed": seed, "chunk_index": chunk_index}
        return M, params, img_b64

    def encode_message_ofdma(self, message: str, cqi: int = 10, blacklist: List[int] = None, session_offset: int = 0) -> List[Dict[str, Any]]:
        """
        Full 5G-Style FH-OFDMA Encoding.
        """
        chunks = self.chunk_message(message)
        encoded_chunks = []
        
        for i, chunk in enumerate(chunks):
            # 1. Generate unique resource Kolam for this chunk
            M, kolam_params, kolam_image = self.generate_kolam_for_chunk(i, chunk)
            
            # Convert Kolam M to a numerical Resource Grid (k x k)
            resource_matrix = M_to_nibble_matrix(M).tolist()
            
            # 2. Convert text to bitstream
            chunk_bits = []
            for char in chunk:
                bits = [int(b) for b in bin(ord(char))[2:].zfill(8)]
                chunk_bits.extend(bits)
            
            # 3. Apply FH-OFDMA Parallel encoding
            telecom_data = fh_ofdma_encode_pipeline(
                chunk_bits, 
                resource_matrix, 
                total_subcarriers=self.channels,
                subcarriers_per_user=8,
                cqi=cqi,
                blacklist=blacklist, 
                session_offset=session_offset
            )
            
            encoded_chunks.append({
                "chunk_index": i,
                "ofdma_frames": telecom_data["frames"],
                "kolam_params": kolam_params,
                "kolam_image": kolam_image,
                "metadata": telecom_data["metadata"]
            })
            
        return encoded_chunks

    def decode_message_ofdma(self, encoded_chunks: List[Dict[str, Any]]) -> str:
        """Decode parallel OFDMA frames back to text."""
        sorted_chunks = sorted(encoded_chunks, key=lambda x: x["chunk_index"])
        decrypted_chunks = []
        
        for chunk_data in sorted_chunks:
            ofdma_frames = chunk_data["ofdma_frames"]
            metadata = chunk_data["metadata"]
            
            decoded_bits, _ = fh_ofdma_decode_pipeline(
                ofdma_frames, 
                total_subcarriers=self.channels,
                metadata=metadata
            )
            
            chunk_str = ""
            for i in range(0, len(decoded_bits), 8):
                byte_bits = decoded_bits[i:i+8]
                if len(byte_bits) < 8: break
                char_str = "".join(map(str, byte_bits))
                chunk_str += chr(int(char_str, 2))
            
            decrypted_chunks.append(chunk_str.rstrip('\x00'))
        
        return "".join(decrypted_chunks)

# --- Legacy Compatibility / Global Helpers ---

def encode_message_with_telecom(message: str, blacklist: List[int] = None, session_offset: int = 0) -> Dict[str, Any]:
    encoder = KolamMessageEncoder(channels=64, chunk_size=8)
    chunks = encoder.encode_message_advanced(message, blacklist, session_offset)
    
    return {
        "type": "telecom_encrypted_message",
        "version": "2.0",
        "chunks": chunks,
        "timestamp": int(time.time() * 1000)
    }

def decode_message_with_telecom(payload: Dict[str, Any]) -> Tuple[str, int]:
    encoder = KolamMessageEncoder()
    return encoder.decode_message_advanced(payload["chunks"])
