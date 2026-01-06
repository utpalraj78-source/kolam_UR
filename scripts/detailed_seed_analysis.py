import sys
import os
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability

def detailed_seed_analysis():
    """Analyze multiple seeds in detail"""
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10
    
    with open('detailed_seed_analysis.txt', 'w', encoding='utf-8') as f:
        f.write("DETAILED SEED-BY-SEED ANALYSIS\n")
        f.write("=" * 80 + "\n\n")
        
        for seed in range(5):
            f.write(f"\n{'='*80}\n")
            f.write(f"SEED {seed}\n")
            f.write(f"{'='*80}\n\n")
            
            result = generate_kolam("p1", 50, k, seed)
            M = np.array(result[0])
            B = compute_binary_from_M(M)
            pure, rnd, hybrid = generate_keys_from_binary(B, mod=mod, bits_per_cell=bits_per_cell)
            
            mask = (1 << bits_per_cell) - 1
            pure = pure & mask
            rnd = rnd & mask
            hybrid = hybrid & mask
            
            # Check XOR
            expected_hybrid = np.bitwise_xor(pure, rnd)
            is_xor = np.array_equal(hybrid, expected_hybrid)
            f.write(f"Hybrid is XOR: {is_xor}\n\n")
            
            # First 10 values
            f.write(f"First 10 key values:\n")
            f.write(f"Pure:   {pure.flatten()[:10]}\n")
            f.write(f"Random: {rnd.flatten()[:10]}\n")
            f.write(f"Hybrid: {hybrid.flatten()[:10]}\n\n")
            
            # Generate hops
            pure_hops = key_to_hops(pure.flatten(), channels, bits_per_cell)
            rnd_hops = key_to_hops(rnd.flatten(), channels, bits_per_cell)
            hybrid_hops = key_to_hops(hybrid.flatten(), channels, bits_per_cell)
            
            # First 10 hops
            f.write(f"First 10 hops:\n")
            f.write(f"Pure:   {pure_hops[:10]}\n")
            f.write(f"Random: {rnd_hops[:10]}\n")
            f.write(f"Hybrid: {hybrid_hops[:10]}\n\n")
            
            # Collisions
            p_coll = true_collision_probability(pure_hops, samples=5000)
            r_coll = true_collision_probability(rnd_hops, samples=5000)
            h_coll = true_collision_probability(hybrid_hops, samples=5000)
            
            f.write(f"Collision Probabilities:\n")
            f.write(f"Pure:   {p_coll:.4f}\n")
            f.write(f"Random: {r_coll:.4f}\n")
            f.write(f"Hybrid: {h_coll:.4f}\n\n")
            
            # Winner
            if h_coll < r_coll:
                winner = "HYBRID WINS"
            elif h_coll > r_coll:
                winner = "RANDOM WINS"
            else:
                winner = "TIE"
            
            f.write(f"Result: {winner}\n")
            f.write(f"Difference: {h_coll - r_coll:.4f} (negative = hybrid better)\n")
    
    print("Detailed analysis complete! Results in detailed_seed_analysis.txt")

if __name__ == "__main__":
    detailed_seed_analysis()
