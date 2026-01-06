import numpy as np
import secrets
from .fhss_utils import hmac_drbg_generate, get_hmac_seed

def cumulative_mod_from_binary(bin_mat, mod=2):
    cs_rows = np.cumsum(bin_mat, axis=0)
    cs_2d = np.cumsum(cs_rows, axis=1)
    return (cs_2d % mod).astype(np.uint8)

def csprng_stream(shape, bits_per_cell=1, key=None, ctr=0, t=0):
    rows, cols = shape
    max_val = (1 << bits_per_cell) - 1
    num_values = rows * cols
    
    if key is not None:
        # Deterministic HMAC-SHA256 DRBG
        values = hmac_drbg_generate(key, ctr, t, num_values, max_val)
    else:
        # Fallback to system randomness
        values = [secrets.randbits(bits_per_cell) & max_val for _ in range(num_values)]
        
    return np.array(values, dtype=np.uint8).reshape(rows, cols)

def smart_hybrid(pure, rnd, bits_per_cell):
    """
    Generate a Hybrid key combining Kolam structure with CSPRNG randomness.
    
    Strategy: Pure XOR (Entropy Preservation).
    Any collision avoidance or adaptive hopping is handled at the
    channel selection stage (Adaptive Frequency Hopping), not here.
    """
    # Pure XOR combines both sources while preserving maximum entropy
    hybrid = np.bitwise_xor(pure, rnd)
    return hybrid.astype(np.uint8)

def generate_keys_from_binary(bin_mat, mod=2, bits_per_cell=1, key=None, ctr=0, t=0):
    pure = cumulative_mod_from_binary(bin_mat, mod)
    rnd = csprng_stream(pure.shape, bits_per_cell, key, ctr, t)
    # Use the new smart hybrid generation
    hybrid = smart_hybrid(pure, rnd, bits_per_cell)
    return pure, rnd, hybrid
