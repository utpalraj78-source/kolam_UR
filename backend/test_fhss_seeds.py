import sys
import os
import numpy as np

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from fhss_utils import get_hmac_seed, hmac_drbg_generate
from algo import csprng_stream, generate_keys_from_binary
from kolam_generator import generate_kolam, build_combined_matrix
from utils import compute_binary_from_M

def test_hmac_determinism():
    key = "secret_key"
    ctr = 1
    t = 0
    
    seed1 = get_hmac_seed(key, ctr, t)
    seed2 = get_hmac_seed(key, ctr, t)
    
    assert seed1 == seed2, "HMAC seed should be deterministic"
    print(f"[PASS] HMAC Seed Determinism: {seed1}")
    
    vals1 = hmac_drbg_generate(key, ctr, t, 10, 255)
    vals2 = hmac_drbg_generate(key, ctr, t, 10, 255)
    
    assert vals1 == vals2, "HMAC DRBG should be deterministic"
    print(f"[PASS] HMAC DRBG Determinism: {vals1}")

def test_hmac_avalanche():
    key = "secret_key"
    ctr = 1
    
    seed1 = get_hmac_seed(key, ctr, 0)
    seed2 = get_hmac_seed(key, ctr, 1)
    
    assert seed1 != seed2, "Different t should produce different seeds"
    print(f"[PASS] HMAC Seed Avalanche: {seed1} vs {seed2}")
    
    vals1 = hmac_drbg_generate(key, ctr, 0, 10, 255)
    vals2 = hmac_drbg_generate(key, ctr, 1, 10, 255)
    
    assert vals1 != vals2, "Different t should produce different DRBG streams"
    print(f"[PASS] HMAC DRBG Avalanche")

def test_algo_integration():
    key = "secret_key"
    ctr = 1
    t = 0
    shape = (5, 5)
    bits_per_cell = 4
    
    # Test CSPRNG stream integration
    stream1 = csprng_stream(shape, bits_per_cell, key, ctr, t)
    stream2 = csprng_stream(shape, bits_per_cell, key, ctr, t)
    
    assert np.array_equal(stream1, stream2), "CSPRNG stream should be deterministic with key"
    print(f"[PASS] CSPRNG Stream Integration")
    
    # Test fallback
    stream3 = csprng_stream(shape, bits_per_cell, key=None)
    stream4 = csprng_stream(shape, bits_per_cell, key=None)
    # Extremely unlikely to be equal
    if np.array_equal(stream3, stream4):
        print("[WARN] Random fallback produced identical streams (highly unlikely)")
    else:
        print(f"[PASS] CSPRNG Fallback (Random)")

def test_full_flow():
    key = "secret_key"
    ctr = 1
    t = 0
    k = 5
    symmetry = "square"
    randomness = 4
    
    # 1. Get seed
    seed = get_hmac_seed(key, ctr, t)
    
    # 2. Generate Kolam
    M, _, _, _, _, _ = generate_kolam(symmetry, randomness, k, seed, analyze=False, return_preview=False)
    B = compute_binary_from_M(M)
    
    # 3. Generate Keys
    pure, rnd, hybrid = generate_keys_from_binary(B, mod=2, bits_per_cell=1, key=key, ctr=ctr, t=t)
    
    print(f"[PASS] Full Flow Execution")
    print(f"Pure shape: {pure.shape}")
    print(f"Rnd shape: {rnd.shape}")
    print(f"Hybrid shape: {hybrid.shape}")

if __name__ == "__main__":
    test_hmac_determinism()
    test_hmac_avalanche()
    test_algo_integration()
    test_full_flow()
