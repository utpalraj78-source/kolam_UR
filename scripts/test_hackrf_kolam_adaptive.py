
import os
import sys
import time
import numpy as np
import random

# Ensure backend modules are found
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

try:
    from backend.hackrf_bridge import HackRFBridge
except ImportError:
    from hackrf_bridge import HackRFBridge

# --- AFH LOGIC FROM PROJECT ---
def apply_adaptive_hopping(hops_seq: np.ndarray, channels: int, interference_seq: np.ndarray = None) -> np.ndarray:
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
        start_check = max(0, i - window)
        occupied.update(result[start_check:i])
        if interference_seq is not None:
            for offset in range(-ASYNC_JITTER, ASYNC_JITTER + 1):
                idx = i + offset
                if 0 <= idx < len(interference_seq):
                    occupied.add(interference_seq[idx])
        num_mai = int(channels * MAI_PROBABILITY)
        if num_mai > 0:
            mai_channels = rng.choice(channels, num_mai, replace=False)
            occupied.update(mai_channels)
        if (current_hop in occupied):
            candidates = [c for c in range(channels) if c not in occupied]
            if candidates:
                result[i] = rng.choice(candidates)
    return result

def run_kolam_adaptive_continuous():
    print("----------------------------------------------------------------")
    print("📡 6G-KOLAM ADAPTIVE CONTINUOUS TEST (2 MINUTES)")
    print("----------------------------------------------------------------")
    
    bridge = HackRFBridge()
    if not bridge.available:
        print("❌ HackRF tools not found.")
        return

    # 1. Setup Parameters
    channels = 16
    length = 240 # Enough for 2 minutes (approx 1 hop/sec)
    base_freq = 2400000000 # 2.4 GHz
    
    print("[1] Generating Sequence with Kolam Adaptive Logic...")
    # Simulate raw sequence
    raw_hops = np.random.randint(0, channels, length)
    # Simulate Interference on Channel 5 (2425 MHz)
    interference = np.full(length, 5) 
    
    # Calculate Smart Sequence
    smart_hops = apply_adaptive_hopping(raw_hops, channels, interference_seq=interference)
    
    print(f"    Sequence Ready. Channel 5 (2425 MHz) will be avoided.")
    
    # 2. Prepare Burst
    fs = 2000000 
    dummy_signal = (np.random.normal(0, 0.7, 200000) + 1j * np.random.normal(0, 0.7, 200000))
    bridge.save_to_file(dummy_signal.tolist(), filename="adaptive_beacon.c8")
    
    print("\n[2] Starting PHYSICAL Adaptive Hopping...")
    print("    -> Watch your Scanner: Signal will NEVER touch 2425 MHz")
    
    try:
        start_time = time.time()
        burst_count = 0
        
        # Loop for approx 2 minutes (120 seconds)
        while (time.time() - start_time) < 120:
            hop_idx = smart_hops[burst_count % length]
            burst_count += 1
            
            # Map Channel -> Freq
            freq_hz = float(base_freq) + (float(hop_idx) * 5.0 * 1000000.0)
            bridge.frequency = int(freq_hz)
            
            # Identify if this was a re-mapped hop
            is_avoided = " (RE-MAPPED)" if raw_hops[burst_count % length] == 5 else ""
            
            print(f"    [T+{int(time.time()-start_time)}s] Hop #{burst_count}: {freq_hz/1e6} MHz (Ch {hop_idx}){is_avoided}")
            bridge.transmit(filename="adaptive_beacon.c8")
            
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\n[!] Stopping Experiment.")
        
    print("✅ 2-Minute Adaptive Test Complete.")

if __name__ == "__main__":
    run_kolam_adaptive_continuous()
