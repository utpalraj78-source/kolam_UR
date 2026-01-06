import sys
import os
import numpy as np

# Add root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability

def quick_test():
    """Quick test with 5 seeds"""
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10
    
    results = []
    
    for seed in range(5):
        result = generate_kolam("p1", 50, k, seed)
        M = np.array(result[0])
        B = compute_binary_from_M(M)
        pure, rnd, hybrid = generate_keys_from_binary(B, mod=mod, bits_per_cell=bits_per_cell)
        
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
        
        results.append({
            'seed': seed,
            'pure': p_coll,
            'random': r_coll,
            'hybrid': h_coll,
            'hybrid_better': h_coll <= r_coll
        })
    
    # Write to file
    with open('hybrid_test_results.txt', 'w') as f:
        f.write("HYBRID KEY FIX TEST RESULTS\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"{'Seed':<8} {'Pure':<12} {'Random':<12} {'Hybrid':<12} {'Winner'}\n")
        f.write("-" * 60 + "\n")
        
        hybrid_wins = 0
        for r in results:
            winner = "Hybrid ✓" if r['hybrid_better'] else "Random"
            if r['hybrid_better']:
                hybrid_wins += 1
            f.write(f"{r['seed']:<8} {r['pure']:<12.4f} {r['random']:<12.4f} {r['hybrid']:<12.4f} {winner}\n")
        
        f.write("-" * 60 + "\n")
        f.write(f"\nHybrid wins: {hybrid_wins}/5\n")
        f.write(f"\nConclusion: {'SUCCESS ✓' if hybrid_wins >= 3 else 'NEEDS WORK'}\n")
    
    print("Test complete! Results written to hybrid_test_results.txt")
    
    # Also print to console
    print(f"\nQuick Summary: Hybrid won {hybrid_wins}/5 tests")
    return hybrid_wins >= 3

if __name__ == "__main__":
    success = quick_test()
    sys.exit(0 if success else 1)
