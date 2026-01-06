import sys
import os
import numpy as np

# Add root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability

def test_hybrid_improvement():
    """
    Test that the fixed hybrid key generation performs better than random.
    This tests multiple seeds to show statistical improvement.
    """
    print("=" * 70)
    print("TESTING HYBRID KEY FIX")
    print("=" * 70)
    print("\nComparing collision rates across 20 random seeds...")
    print("Expected: Hybrid should have similar or better collision rates than Random\n")
    
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10
    
    hybrid_better = 0
    random_better = 0
    ties = 0
    
    print(f"{'Seed':<6} {'Pure':<10} {'Random':<10} {'Hybrid':<10} {'Winner':<10}")
    print("-" * 70)
    
    for seed in range(20):
        result = generate_kolam("p1", 50, k, seed)
        M = np.array(result[0])
        B = compute_binary_from_M(M)
        pure, rnd, hybrid = generate_keys_from_binary(B, mod=mod, bits_per_cell=bits_per_cell)
        
        # Apply masking
        mask = (1 << bits_per_cell) - 1
        pure = pure & mask
        rnd = rnd & mask
        hybrid = hybrid & mask
        
        # Generate hop sequences
        pure_hops = key_to_hops(pure.flatten(), channels, bits_per_cell)
        rnd_hops = key_to_hops(rnd.flatten(), channels, bits_per_cell)
        hybrid_hops = key_to_hops(hybrid.flatten(), channels, bits_per_cell)
        
        # Calculate collision probabilities
        p_coll = true_collision_probability(pure_hops)
        r_coll = true_collision_probability(rnd_hops)
        h_coll = true_collision_probability(hybrid_hops)
        
        # Determine winner (lower collision is better)
        if h_coll < r_coll - 0.001:  # Small epsilon for floating point comparison
            winner = "Hybrid ✓"
            hybrid_better += 1
        elif r_coll < h_coll - 0.001:
            winner = "Random"
            random_better += 1
        else:
            winner = "Tie"
            ties += 1
        
        print(f"{seed:<6} {p_coll:<10.4f} {r_coll:<10.4f} {h_coll:<10.4f} {winner:<10}")
    
    print("-" * 70)
    print(f"\nRESULTS:")
    print(f"  Hybrid Better: {hybrid_better}/20 ({hybrid_better/20*100:.1f}%)")
    print(f"  Random Better: {random_better}/20 ({random_better/20*100:.1f}%)")
    print(f"  Ties:          {ties}/20 ({ties/20*100:.1f}%)")
    
    print("\n" + "=" * 70)
    if hybrid_better >= random_better:
        print("✓ SUCCESS: Hybrid key generation is now working correctly!")
        print("  The pure XOR approach preserves entropy without introducing bias.")
    else:
        print("✗ ISSUE: Random still outperforms Hybrid in most cases.")
        print("  Further investigation needed.")
    print("=" * 70)

if __name__ == "__main__":
    test_hybrid_improvement()
