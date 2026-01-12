
import os
import time
import numpy as np
import hashlib
import hmac
import struct

def generate_hybrid_seed(master_secret: str = "KOLAM_6G_SECRET_KEY"):
    """
    Combines three entropy sources into a high-density 256-bit seed.
    1. Static Secret (Project Key)
    2. Dynamic Entropy (System Time)
    3. Hardware Entropy (os.urandom)
    """
    source1 = master_secret.encode()
    source2 = str(time.time_ns()).encode()
    source3 = os.urandom(32)
    
    combined = source1 + b":" + source2 + b":" + source3
    return hashlib.sha256(combined).digest()

def get_hybrid_hops(seed: bytes, count: int, channels: int):
    """
    Expands the hybrid seed into a sequence of channel indices.
    Uses HMAC-SHA256 in counter mode for deterministic but chaotic output.
    """
    hops = []
    counter = 0
    while len(hops) < count:
        msg = struct.pack(">Q", counter) # 8-byte uint64 counter
        h = hmac.new(seed, msg, hashlib.sha256).digest()
        # Each hash provides 32 bytes, we can get ~8-16 hops per hash safely
        for i in range(0, 32, 4):
            if len(hops) >= count: break
            val = int.from_bytes(h[i:i+4], "big")
            hops.append(val % channels)
        counter += 1
    return hops

def generate_bt_interference_data(sample_rate=20000000):
    """
    KOLAM MULTI-TONE FLOODING:
    Generates 5 simultaneous high-entropy spikes across 20MHz.
    This 'comb' signal kills multiple BT channels in one transmit call.
    """
    num_samples = 1000000 # 50ms at 20Msps
    t = np.arange(num_samples) / sample_rate
    
    # Base Kolam Noise
    noise = (np.random.normal(0, 0.4, num_samples) + 1j * np.random.normal(0, 0.4, num_samples))
    
    # Add 5 Carrier Spikes (+- 2, 4, 6, 8 MHz from center)
    comb_signal = np.zeros(num_samples, dtype=complex)
    offsets = [-8e6, -4e6, 0, 4e6, 8e6]
    
    for offset in offsets:
        # Each spike is a shifted Kolam high-entropy carrier
        carrier = np.exp(1j * 2 * np.pi * offset * t)
        comb_signal += carrier * (np.random.normal(0, 0.2, num_samples) + 1j * np.random.normal(0, 0.2, num_samples))
    
    # Merge base noise and comb
    final_data = comb_signal + noise
    return final_data
