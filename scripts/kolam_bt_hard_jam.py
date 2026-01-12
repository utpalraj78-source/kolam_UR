import os
import sys
import time
import numpy as np
import subprocess

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.hackrf_bridge import HackRFBridge

def generate_hard_jam_signal(duration_ms=200):
    sample_rate = 20000000 # 20Msps
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    t = np.arange(num_samples) / sample_rate
    
    # Generate 5 simultaneous Kolam spikes to flood a 20MHz block
    offsets = [-8e6, -4e6, 0, 4e6, 8e6]
    signal = np.zeros(num_samples, dtype=complex)
    
    for off in offsets:
        # Create a phase-jittered carrier for each spike
        jitter = np.exp(1j * np.random.uniform(0, 2*np.pi, num_samples))
        carrier = np.exp(1j * 2 * np.pi * off * t)
        signal += carrier * jitter * 0.2
        
    # Add base floor noise
    signal += (np.random.normal(0, 0.3, num_samples) + 1j * np.random.normal(0, 0.3, num_samples))
    return signal

def run_hard_jam():
    bridge = HackRFBridge()
    if not bridge.available:
        print("Error: HackRF not found!")
        return

    # Pre-generate the "Wall of Noise"
    print("[KOLAM-6G] Generating Multi-Tone BT-Killer Signal...")
    samples = generate_hard_jam_signal(1000) # 1 second bursts
    iq_path = os.path.abspath("bt_hard_kill.c8")
    bridge.save_to_file(samples.tolist(), filename=iq_path)

    sectors = [2410e6, 2430e6, 2450e6, 2470e6]
    
    print(f"--- BT JAMMER [SAFE MODE] ---")
    print(f"Lowering Power to 20 Gain / No Amp to prevent USB disconnects.")
    
    try:
        while True:
            for freq in sectors:
                print(f"\n[RADIO] Flooding Sector: {freq/1e6} MHz...")
                bridge.frequency = int(freq)
                cmd = [
                    bridge.tool_path,
                    "-t", iq_path,
                    "-f", str(bridge.frequency),
                    "-s", "10000000", # Lower sample rate (10Msps)
                    "-a", "0", # AMP OFF
                    "-x", "20", # LOW GAIN
                    "-n", "30000000" # ~3 seconds
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    print(f"RADIO ERROR: {result.stderr}")
                else:
                    print("Burst Successful.")
    except KeyboardInterrupt:
        print("\nStopping.")

if __name__ == "__main__":
    run_hard_jam()
