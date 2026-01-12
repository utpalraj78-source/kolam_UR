
import os
import sys
import time
import numpy as np

# Ensure backend modules are found
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

try:
    from backend.hackrf_bridge import HackRFBridge
except ImportError:
    from hackrf_bridge import HackRFBridge

def run_continuous_tx():
    print("----------------------------------------------------------------")
    print("📡 HACKRF CONTINUOUS TRANSMISSION BEACON")
    print("----------------------------------------------------------------")
    print("This script will transmit a specialized Kolam Signal continuously.")
    print("Use this to verify the TX LED or view the signal on a Spectrum Analyzer.")
    print("Frequency: 2.45 GHz")
    print("----------------------------------------------------------------")
    
    bridge = HackRFBridge()
    if not bridge.available:
        print("❌ HackRF tools not found.")
        print(f"   Checked path: {bridge.tool_path}")
        return

    # 1. Generate 1 Second of "Kolam Noise" (random QAM-like data)
    print("[1] Generating 1 Second of Signal Loop Buffer...")
    fs = 2000000 # 2 Msps
    duration = 1.0 # 1 second
    num_samples = int(fs * duration)
    
    # Generate random complex noise (simulating encrypted traffic)
    # Amplitude 0.7 to avoid clipping but keep it bright
    samples = (np.random.normal(0, 0.7, num_samples) + 1j * np.random.normal(0, 0.7, num_samples))
    
    # Create the file
    filename = "continuous_beacon.c8"
    bridge.save_to_file(samples.tolist(), filename=filename)
    
    print(f"[2] Starting Continuous Loop (Press Ctrl+C to Stop)...")
    print("    -> Look at the RED 'TX' LED on your HackRF.")
    
    try:
        burst_count = 0
        channels = [2412e6, 2422e6, 2432e6, 2442e6, 2452e6, 2462e6, 2472e6] # Standard Wi-Fi center freqs
        
        print("    [Info] Auto-stopping after 120 cycles (~2 minutes) for safety.")
        while burst_count < 120:
            burst_count += 1
            
            # Select next frequency (Hop!)
            freq = channels[burst_count % len(channels)]
            bridge.frequency = int(freq)
            
            print(f"    >> [Cycle {burst_count}] Hopping to {freq/1e6} MHz -> TRANSMITTING")
            
            # Using the bridge logic which invokes 'hackrf_transfer'
            bridge.transmit(filename=filename)
            
            # Tiny sleep to let user ctrl-c easily if needed
            time.sleep(0.05)
            
    except KeyboardInterrupt:
        print("\n[!] Stopping Transmission...")
        print("✅ Done.")

if __name__ == "__main__":
    run_continuous_tx()
