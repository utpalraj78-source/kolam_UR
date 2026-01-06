import sys
import os
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam
from backend.utils import compute_binary_from_M
from backend.algo import generate_keys_from_binary
from backend.main import key_to_hops, true_collision_probability

def analyze_keys():
    """Analyze what's happening with the keys"""
    mod = 256
    bits_per_cell = 4
    channels = 64
    k = 10
    seed = 0
    
    result = generate_kolam("p1", 50, k, seed)
    M = np.array(result[0])
    B = compute_binary_from_M(M)
    pure, rnd, hybrid = generate_keys_from_binary(B, mod=mod, bits_per_cell=bits_per_cell)
    
    mask = (1 << bits_per_cell) - 1
    pure = pure & mask
    rnd = rnd & mask
    hybrid = hybrid & mask
    
    print("KEY ANALYSIS")
    print("=" * 70)
    print(f"\nKey shapes: {pure.shape}")
    print(f"\nFirst 20 values of each key (flattened):")
    print(f"Pure:   {pure.flatten()[:20]}")
    print(f"Random: {rnd.flatten()[:20]}")
    print(f"Hybrid: {hybrid.flatten()[:20]}")
    
    # Check if hybrid is actually XOR
    expected_hybrid = np.bitwise_xor(pure, rnd)
    is_xor = np.array_equal(hybrid, expected_hybrid)
    print(f"\nHybrid is pure XOR: {is_xor}")
    
    # Generate hops
    pure_hops = key_to_hops(pure.flatten(), channels, bits_per_cell)
    rnd_hops = key_to_hops(rnd.flatten(), channels, bits_per_cell)
    hybrid_hops = key_to_hops(hybrid.flatten(), channels, bits_per_cell)
    
    print(f"\nHop sequence lengths:")
    print(f"Pure:   {len(pure_hops)}")
    print(f"Random: {len(rnd_hops)}")
    print(f"Hybrid: {len(hybrid_hops)}")
    
    print(f"\nFirst 20 hops:")
    print(f"Pure:   {pure_hops[:20]}")
    print(f"Random: {rnd_hops[:20]}")
    print(f"Hybrid: {hybrid_hops[:20]}")
    
    # Collision analysis
    p_coll = true_collision_probability(pure_hops)
    r_coll = true_collision_probability(rnd_hops)
    h_coll = true_collision_probability(hybrid_hops)
    
    print(f"\nCollision Probabilities:")
    print(f"Pure:   {p_coll:.4f}")
    print(f"Random: {r_coll:.4f}")
    print(f"Hybrid: {h_coll:.4f}")
    
    # Entropy analysis
    def calculate_entropy(hops):
        unique, counts = np.unique(hops, return_counts=True)
        probs = counts / len(hops)
        entropy = -np.sum(probs * np.log2(probs + 1e-12))
        max_entropy = np.log2(channels)
        return entropy, max_entropy
    
    p_ent, max_ent = calculate_entropy(pure_hops)
    r_ent, _ = calculate_entropy(rnd_hops)
    h_ent, _ = calculate_entropy(hybrid_hops)
    
    print(f"\nEntropy (max={max_ent:.2f}):")
    print(f"Pure:   {p_ent:.4f} ({p_ent/max_ent*100:.1f}%)")
    print(f"Random: {r_ent:.4f} ({r_ent/max_ent*100:.1f}%)")
    print(f"Hybrid: {h_ent:.4f} ({h_ent/max_ent*100:.1f}%)")
    
    # Check for consecutive repeats
    def count_consecutive_repeats(hops):
        repeats = 0
        for i in range(1, len(hops)):
            if hops[i] == hops[i-1]:
                repeats += 1
        return repeats
    
    p_rep = count_consecutive_repeats(pure_hops)
    r_rep = count_consecutive_repeats(rnd_hops)
    h_rep = count_consecutive_repeats(hybrid_hops)
    
    print(f"\nConsecutive Repeats:")
    print(f"Pure:   {p_rep}/{len(pure_hops)} ({p_rep/len(pure_hops)*100:.1f}%)")
    print(f"Random: {r_rep}/{len(rnd_hops)} ({r_rep/len(rnd_hops)*100:.1f}%)")
    print(f"Hybrid: {h_rep}/{len(hybrid_hops)} ({h_rep/len(hybrid_hops)*100:.1f}%)")
    
    print("\n" + "=" * 70)
    print("DIAGNOSIS:")
    if h_coll > r_coll:
        print("X Hybrid has HIGHER collision rate than Random")
        print("\nPossible reasons:")
        print("1. Pure key has strong patterns that persist through XOR")
        print("2. The way key_to_hops groups cells amplifies XOR artifacts")
        print("3. Pure and Random might have correlated patterns")
    else:
        print("OK Hybrid has LOWER or EQUAL collision rate")

if __name__ == "__main__":
    import sys
    # Redirect output to file with UTF-8 encoding
    with open('hybrid_analysis.txt', 'w', encoding='utf-8') as f:
        sys.stdout = f
        analyze_keys()
    sys.stdout = sys.__stdout__
    print("Analysis complete! Results written to hybrid_analysis.txt")
