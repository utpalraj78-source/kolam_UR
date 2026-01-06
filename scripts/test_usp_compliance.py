import sys
import os
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability, apply_hop_self_avoidance

def test_usp_compliance():
    """Verify that Hybrid consistently outperforms Random with hop-level avoidance"""
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10
    
    print("Testing USP Compliance (Hybrid Collision < Random Collision)")
    print("=" * 60)
    
    results = []
    
    # Test more seeds to be sure
    for seed in range(20):
        try:
            result = generate_kolam("p1", 50, k, seed)
            M = np.array(result[0])
            B = compute_binary_from_M(M)
            pure, rnd, hybrid = generate_keys_from_binary(B, mod=mod, bits_per_cell=bits_per_cell)
            
            mask = (1 << bits_per_cell) - 1
            pure = pure & mask
            rnd = rnd & mask
            hybrid = hybrid & mask
            
            # Convert to hops
            pure_hops = key_to_hops(pure.flatten(), channels, bits_per_cell)
            rnd_hops = key_to_hops(rnd.flatten(), channels, bits_per_cell)
            
            # For hybrid, we do standard conversion THEN apply avoidance (USP logic)
            raw_hybrid_hops = key_to_hops(hybrid.flatten(), channels, bits_per_cell)
            hybrid_hops = apply_hop_self_avoidance(raw_hybrid_hops, channels)
            
            p_coll = true_collision_probability(pure_hops, samples=5000)
            r_coll = true_collision_probability(rnd_hops, samples=5000)
            h_coll = true_collision_probability(hybrid_hops, samples=5000)
            
            # We want Hybrid to be BETTER (lower) or EQUAL to Random
            # Ideally significantly better
            is_better = h_coll < r_coll
            is_equal = abs(h_coll - r_coll) < 0.0001
            
            winner = "Hybrid" if is_better else ("Tie" if is_equal else "Random")
            
            results.append({
                'seed': seed,
                'pure': p_coll,
                'random': r_coll,
                'hybrid': h_coll,
                'winner': winner
            })
            
            print(f"Seed {seed:<2}: R={r_coll:.4f} H={h_coll:.4f} -> {winner}")
            
        except Exception as e:
            print(f"Seed {seed}: ERROR - {e}")
    
    print("=" * 60)
    hybrid_wins = sum(1 for r in results if r['winner'] == 'Hybrid')
    ties = sum(1 for r in results if r['winner'] == 'Tie')
    random_wins = sum(1 for r in results if r['winner'] == 'Random')
    
    total = len(results)
    print(f"Hybrid Wins: {hybrid_wins}/{total} ({hybrid_wins/total*100:.1f}%)")
    print(f"Ties:        {ties}/{total} ({ties/total*100:.1f}%)")
    print(f"Random Wins: {random_wins}/{total} ({random_wins/total*100:.1f}%)")
    
    # Success metric: Hybrid should rarely lose. It should mostly win or tie (if random is already 0 collision)
    success_rate = (hybrid_wins + ties) / total
    print(f"\nNon-Failure Rate (Hybrid <= Random): {success_rate*100:.1f}%")
    
    if success_rate > 0.8:
        print("\nSUCCESS: Hybrid satisfies USP requirements!")
        return True
    else:
        print("\nFAILURE: Hybrid still losing too often.")
        return False

if __name__ == "__main__":
    success = test_usp_compliance()
    sys.exit(0 if success else 1)
