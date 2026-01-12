
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

# Copied Logic to avoid complex dependencies (FastAPI, etc) in standalone script
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

        is_collision = (current_hop in occupied)
        
        if is_collision:
            candidates = [c for c in range(channels) if c not in occupied]
            if candidates:
                result[i] = rng.choice(candidates)
            else:
                critical_block = set()
                if interference_seq is not None and i < len(interference_seq):
                    critical_block.add(interference_seq[i])
                
                soft_candidates = [c for c in range(channels) if c not in critical_block]
                if soft_candidates:
                    result[i] = rng.choice(soft_candidates)
                else:
                    pass
                
    return result

def run_adaptive_hopping_experiment():
    print("----------------------------------------------------------------")
    print("📡 KOLAM-FHSS ADAPTIVE HOPPING TEST (LIVE AIR INTERFACE)")
    print("----------------------------------------------------------------")
    
    bridge = HackRFBridge()
    if not bridge.available:
        print("❌ HackRF tools not found.")
        return

    # 1. Generate a "Bad" Sequence (With collisions/interference)
    # Simulate a crowded spectrum where Channel 5 and 10 are jammed
    print("[1] Generating Hop Sequence...")
    channels = 16
    length = 50
    
    # Random initial sequence (Simulating raw Kolam output)
    raw_hops = np.random.randint(0, channels, length)
    
    # "Interference" sequence (e.g., a constant Jammer on Channel 5)
    interference = np.full(length, 5) 
    
    # 2. Apply Adaptive Logic (The exact function from your project)
    # This will intelligently remap hops that collide with the jammer
    smart_hops = apply_adaptive_hopping(raw_hops, channels, interference_seq=interference)
    
    print(f"    Raw Hops  : {raw_hops[:10]}...")
    print(f"    Smart Hops: {smart_hops[:10]}... (Avoids Ch 5 & Local Collisions)")
    
    # 3. Transmit the Smart Sequence via HackRF
    # We will transmit short bursts, physically retuning the radio each time using the smart sequence
    # 2.4 GHz + (Channel * 5 MHz) separation
    base_freq = 2400000000 # 2.4 GHz
    
    print("\n[2] Starting PHYSICAL Frequency Hopping...")
    print("    -> Watch your Spectrum Analyzer App!")
    print("    -> You will see the signal 'dance' around interference.")
    
    try:
        # Create a generic signal burst file once (reused for each hop)
        dummy_signal = (np.random.normal(0, 0.7, 4000) + 1j * np.random.normal(0, 0.7, 4000))
        bridge.save_to_file(dummy_signal.tolist(), filename="hop_burst.c8")
        
        # Execute Hopping
        for i, hop_idx in enumerate(smart_hops):
            # Calculate physical frequency
            # Ch 0 = 2412 MHz (Wi-Fi 1)
            # Ch 1 = 2417 MHz...
            # Simplified: 2400 + (Index * 5) MHz
            freq_hz = float(base_freq) + (float(hop_idx) * 5.0 * 1000000.0)
            
            # Update Bridge Frequency (Hack: modify property directly for this test loop)
            bridge.frequency = int(freq_hz)
            
            print(f"    [Hop {i+1}/{length}] Tuning to {freq_hz/1e6} MHz (Ch {hop_idx}) -> FIRE!")
            bridge.transmit(filename="hop_burst.c8")
            
            # Dwell time (how long we stay on freq)
            # Fast hopping is better, but USB latency limits us to ~50-100ms
            # time.sleep(0.05) 
            
    except KeyboardInterrupt:
        print("\n[!] Stopping Experiment.")
        
    print("✅ Experiment Complete.")
    print("   Did you see the signal avoid Channel 5 (2425 MHz)?")

if __name__ == "__main__":
    run_adaptive_hopping_experiment()
