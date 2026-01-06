import sys
import os
import numpy as np

# Add root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability

def find_bad_run():
    print("Searching for bad run (Hybrid Collision > Random Collision)...")
    
    # Default params
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10 # Small grid = high variance
    
    for seed in range(100):
        result = generate_kolam("p1", 50, k, seed)
        M = np.array(result[0])
        B = compute_binary_from_M(M)
        pure, rnd, hybrid = generate_keys_from_binary(B, mod=mod, bits_per_cell=bits_per_cell)
        
        # Fix for masking (replicate backend fix)
        mask = (1 << bits_per_cell) - 1
        pure = pure & mask
        rnd = rnd & mask
        hybrid = hybrid & mask
        
        pure_hops = key_to_hops(pure.flatten(), channels, bits_per_cell)
        rnd_hops = key_to_hops(rnd.flatten(), channels, bits_per_cell)
        hybrid_hops = key_to_hops(hybrid.flatten(), channels, bits_per_cell)
        
        p_coll = true_collision_probability(pure_hops)
        r_coll = true_collision_probability(rnd_hops)
        h_coll = true_collision_probability(hybrid_hops)
        
        if h_coll > r_coll:
            print(f"\nFOUND BAD RUN at Seed {seed}:")
            print(f"Pure:   {p_coll:.4f}")
            print(f"Random: {r_coll:.4f}")
            print(f"Hybrid: {h_coll:.4f}")
            print("Hybrid is WORSE than Random.")
            return seed
            
    print("No bad run found in 100 seeds.")
    return None

if __name__ == "__main__":
    find_bad_run()
