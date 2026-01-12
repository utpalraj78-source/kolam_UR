
import asyncio
import time
import numpy as np
import os
import sys

# Ensure backend modules are found
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

try:
    from backend.hackrf_bridge import HackRFBridge
except ImportError:
    from hackrf_bridge import HackRFBridge

async def run_throughput_test():
    print("----------------------------------------------------------------")
    print("6G-KOLAM HARDWARE THROUGHPUT BENCHMARK")
    print("----------------------------------------------------------------")
    
    bridge = HackRFBridge()
    if not bridge.available:
        print("ERROR: HackRF Hardware Not Detected. Connect and try again.")
        return

    # 1. Config for High Load (PUSHING TO 20MSPS LIMIT)
    SAMPLE_RATE = 20000000 # 20 Msps (The absolute chip limit)
    bridge.sample_rate = SAMPLE_RATE
    ITERATIONS = 5
    BUFFER_SECONDS = 0.5 
    
    print(f"[*] Configuration: {SAMPLE_RATE/1e6} Msps | High-Entropy Kolam Stream")
    
    # 2. Pre-generate Signal
    num_samples = int(SAMPLE_RATE * BUFFER_SECONDS)
    print(f"[*] Generating {num_samples} samples per iteration...")
    
    # Simulating 6G data (Complex floats)
    data = (np.random.normal(0, 0.5, num_samples) + 1j * np.random.normal(0, 0.5, num_samples))
    file_path = bridge.save_to_file(data.tolist(), filename="throughput_stress.c8")
    
    # Calculate bits (CS8 = 2 bytes per sample, 8 bits per byte)
    total_bits_per_file = os.path.getsize(file_path) * 8
    
    print("\n[3] Executing Hardware-In-The-Loop Benchmark...")
    print("    Starting high-speed bursts...")
    
    results = []
    
    try:
        for i in range(ITERATIONS):
            start = time.perf_counter()
            
            # Physical TX
            bridge.transmit(filename="throughput_stress.c8")
            
            end = time.perf_counter()
            duration = end - start
            
            # Mbps = Total Bits / Seconds
            mbps = (total_bits_per_file / 1e6) / duration
            results.append(mbps)
            
            print(f"    >> Burst #{i+1}: {mbps:.2f} Mbps [Processing time: {duration:.3f}s]")
            time.sleep(0.05)
            
    except Exception as e:
        print(f"Error during test: {e}")
        return

    avg_mbps = sum(results) / len(results)
    
    print(f"\n[FINAL REPORT]")
    print(f"================================================================")
    print(f"   HARDWARE DEVICE   : HackRF One (SDR)")
    print(f"   TARGET SAMPLE RATE: {SAMPLE_RATE/1e6} Msps")
    print(f"   THEORETICAL LIMIT : {SAMPLE_RATE * 16 / 1e6} Mbps (Raw IQ)")
    print(f"   MEASURED THROUGHPUT: {avg_mbps:.2f} Mbps")
    print(f"   PROTOCOL OVERHEAD : {100 - (avg_mbps/(SAMPLE_RATE*16/1e6)*100):.1f}% (USB Latency)")
    print(f"   VERDICT           : {'OPTIMAL' if avg_mbps > 5 else 'SUB-OPTIMAL'}")
    print(f"================================================================")
    print("This shows the actual bitrate being pushed through the radio.")

if __name__ == "__main__":
    asyncio.run(run_throughput_test())
