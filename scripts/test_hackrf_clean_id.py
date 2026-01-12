
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

def generate_simple_beacon(ssid="KOLAM_6G_CORE"):
    fc = b"\x80\x00" 
    dur = b"\x00\x00"
    da = b"\xff\xff\xff\xff\xff\xff"
    sa = b"\x13\x37\xDE\xAD\xBE\xEF"
    bssid = b"\x13\x37\xDE\xAD\xBE\xEF"
    seq = b"\x00\x00"
    ts = b"\x00" * 8
    inv = b"\x64\x00"
    cap = b"\x01\x00"
    tag_ssid = b"\x00" + bytes([len(ssid)]) + ssid.encode()
    tag_rates = b"\x01\x04\x82\x84\x8b\x96"
    tag_ds = b"\x03\x01\x01" # Channel 1 for clean start
    
    return fc + dur + da + sa + bssid + seq + ts + inv + cap + tag_ssid + tag_rates + tag_ds

async def run_clean_id_test():
    print("----------------------------------------------------------------")
    print("6G-KOLAM: CLEAN IDENTITY BROADCAST (NAME ONLY)")
    print("----------------------------------------------------------------")
    
    bridge = HackRFBridge()
    if not bridge.available:
        print("ERROR: HackRF Not Found.")
        return

    ssid = "KOLAM_6G_CORE"
    beacon_raw = generate_simple_beacon(ssid)
    
    # Generate 1 second of high-quality beacon pulses
    # We use a 2MHz sample rate (Standard for Wi-Fi)
    SAMPLE_RATE = 10000000 
    bridge.sample_rate = SAMPLE_RATE
    bridge.frequency = 2437000000 # Channel 6 (More standard)
    
    print(f"[*] Targeting Channel 6 ({bridge.frequency/1e6} MHz)")
    
    # Create cleaner pulses
    iq_frame = (np.unpackbits(np.frombuffer(beacon_raw, dtype=np.uint8)) * 2 - 1).astype(complex)
    samples = []
    # Repeat the frame to fill 50ms gaps
    for _ in range(100):
        samples.extend(iq_frame.tolist())
        samples.extend([0j] * 5000)
        
    # Force save to a known location
    iq_path = os.path.join(project_root, "clean_id.c8")
    bridge.save_to_file(samples, filename=iq_path)
    time.sleep(1) # Wait for disk

    print(f"[*] Broadcasting IDENTITY: {ssid}")
    print("[*] Checked file: " + iq_path + " Size: " + str(os.path.getsize(iq_path)))

    try:
        while True:
            bridge.transmit(filename=iq_path)
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n[!] Stopped.")

if __name__ == "__main__":
    asyncio.run(run_clean_id_test())
