
import numpy as np

def apply_adaptive_hopping_TEST(hops_seq: np.ndarray, channels: int, interference_seq: np.ndarray = None) -> np.ndarray:
    if hops_seq.size <= 1 or channels <= 1:
        return hops_seq
    
    result = hops_seq.copy()
    window = min(4, channels - 1)
    
    rng = np.random.RandomState(42)
    
    MAI_PROBABILITY = 0.15
    ASYNC_JITTER = 1

    for i in range(1, len(result)):
        current_hop = result[i]
        occupied = set()
        
        # A. Self-History
        start_check = max(0, i - window)
        occupied.update(result[start_check:i])
        
        # B. Interference
        if interference_seq is not None:
            for offset in range(-ASYNC_JITTER, ASYNC_JITTER + 1):
                idx = i + offset
                if 0 <= idx < len(interference_seq):
                    occupied.add(interference_seq[idx])

        # C. MAI
        num_mai = int(channels * MAI_PROBABILITY)
        if num_mai > 0:
            mai_channels = rng.choice(channels, num_mai, replace=False)
            occupied.update(mai_channels)

        is_collision = (current_hop in occupied)
        
        if is_collision:
            candidates = [c for c in range(channels) if c not in occupied]
            if candidates:
                new_hop = rng.choice(candidates)
                print(f"Index {i}: Collision {current_hop} -> Changed to {new_hop}. Occupied: {occupied}")
                result[i] = new_hop
            else:
                print(f"Index {i}: Resource Constraint! Could not move from {current_hop}.")
    
    return result

# Test Case
channels = 32
hybrid_raw = np.array([5, 10, 26, 15, 20])
random_seq = np.array([3, 12, 26, 8,  9]) 
# Index 2 is 26 in both. Should detect collision.

print("Testing Adaptive Hopping Logic...")
adaptive = apply_adaptive_hopping_TEST(hybrid_raw, channels, interference_seq=random_seq)
print(f"Original: {hybrid_raw}")
print(f"Random:   {random_seq}")
print(f"Adaptive: {adaptive}")

if adaptive[2] == 26:
    print("FAILURE: Did not avoid collision at index 2")
else:
    print("SUCCESS: Avoided collision at index 2")
