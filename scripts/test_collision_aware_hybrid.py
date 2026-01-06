import sys
import os
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability

def test_new_hybrid():
    """Test the new collision-aware hybrid strategy"""
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10
    
    print("Testing New Collision-Aware Hybrid Strategy")
    print("=" * 60)
    
    results = []
    for seed in range(10):
        try:
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
            
            p_coll = true_collision_probability(pure_hops, samples=5000)
            r_coll = true_collision_probability(rnd_hops, samples=5000)
            h_coll = true_collision_probability(hybrid_hops, samples=5000)
            
            winner = "Hybrid" if h_coll <= r_coll else "Random"
            results.append({
                'seed': seed,
                'pure': p_coll,
                'random': r_coll,
                'hybrid': h_coll,
                'winner': winner
            })
            
            print(f"Seed {seed}: P={p_coll:.4f} R={r_coll:.4f} H={h_coll:.4f} -> {winner}")
            
        except Exception as e:
            print(f"Seed {seed}: ERROR - {e}")
            import traceback
            traceback.print_exc()
    
    print("=" * 60)
    hybrid_wins = sum(1 for r in results if r['winner'] == 'Hybrid')
    print(f"\nHybrid wins: {hybrid_wins}/{len(results)} ({hybrid_wins/len(results)*100:.1f}%)")
    print(f"Target: >50% for USP claim")
    
    if hybrid_wins >= len(results) * 0.5:
        print("\nSUCCESS: Hybrid consistently reduces collisions!")
    else:
        print("\nNEEDS IMPROVEMENT: Hybrid not winning enough")
    
    return hybrid_wins >= len(results) * 0.5

if __name__ == "__main__":
    success = test_new_hybrid()
    sys.exit(0 if success else 1)
