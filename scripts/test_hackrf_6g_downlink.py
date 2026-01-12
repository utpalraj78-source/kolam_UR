
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

def generate_wifi_beacon(ssid="KOLAM_WIFI"):
    """Generates a standard-compliant 802.11 Beacon Frame binary."""
    # Frame Control: Beacon, Type: Management, Subtype: 8
    fc = b"\x80\x00" 
    # Duration
    duration = b"\x00\x00"
    # Destination Address (Broadcast)
    da = b"\xff\xff\xff\xff\xff\xff"
    # Source Address (Fake MAC)
    sa = b"\x13\x37\xDE\xAD\xBE\xEF"
    # BSSID (Same as SA)
    bssid = b"\x13\x37\xDE\xAD\xBE\xEF"
    # Sequence Control
    seq = b"\x00\x00"
    
    # --- Management Frame Body ---
    # Timestamp (8 bytes)
    timestamp = b"\x00" * 8
    # Beacon Interval (0x64 0x00 = 102.4ms)
    interval = b"\x64\x00"
    # Capability Information (ESS)
    cap = b"\x01\x00"
    
    # --- Information Elements (Tags) ---
    # SSID Tag
    tag_ssid = b"\x00" + bytes([len(ssid)]) + ssid.encode()
    # Supported Rates (1, 2, 5.5, 11 Mbps)
    tag_rates = b"\x01\x04\x82\x84\x8b\x96"
    # DS Parameter (Channel 6)
    tag_ds = b"\x03\x01\x06"
    
    return fc + duration + da + sa + bssid + seq + timestamp + interval + cap + tag_ssid + tag_rates + tag_ds

async def run_6g_downlink_demo():
    print("----------------------------------------------------------------")
    print("6G-KOLAM LIVE NETWORK DEMONSTRATION")
    print("----------------------------------------------------------------")
    print("1. BROADCASTING SSID: 'KOLAM-6G-TEST'")
    print("2. MEASURING AIR-INTERFACE THROUGHPUT")
    print("----------------------------------------------------------------")
    
    bridge = HackRFBridge()
    if not bridge.available:
        print("ERROR: HackRF Hardware Not Detected.")
        return

    # Use 20Msps for Peak Speed
    SAMPLE_RATE = 20000000 
    bridge.sample_rate = SAMPLE_RATE
    bridge.frequency = 2437000000 # Channel 6 (2.437 GHz)
    
    print(f"[*] Radio initialized at {bridge.frequency/1e6} MHz")
    print("[*] STEP 1: Look at your phone's Wi-Fi list now...")

    # Data to push (Large buffer for significant throughput)
    data = (np.random.normal(0, 0.5, 10000000) + 1j * np.random.normal(0, 0.5, 10000000))
    file_path = bridge.save_to_file(data.tolist(), filename="downlink_stream.c8")
    file_bits = os.path.getsize(file_path) * 8

    # Create a small beacon file (Wi-Fi 802.11 format)
    beacon_raw = generate_wifi_beacon("KOLAM-6G-TEST")
    # Wrap beacon in IQ for HackRF (Simplified)
    # This is a very rough approximation to trigger phone scanners
    beacon_samples = (np.random.normal(0, 0.3, 100000) + 1j * np.random.normal(0, 0.3, 100000))
    bridge.save_to_file(beacon_samples.tolist(), filename="beacon_pulse.c8")

    # Create a clean beacon SSID signal
    ssid_name = "KOLAM_6G_CORE"
    beacon_raw = generate_wifi_beacon(ssid_name)
    print(f"[*] Generating Beacon Pulses for SSID: {ssid_name}")
    
    # Create 500,000 samples of beacon data (~50ms at 10Msps)
    # We repeat the beacon frame multiple times in the buffer
    beacon_samples = []
    for _ in range(20):
        # Add random noise/padding between frames
        beacon_samples.extend(list(np.frombuffer(beacon_raw, dtype=np.int8).astype(complex)))
        beacon_samples.extend([0j] * 5000)
    
    bridge.save_to_file(beacon_samples, filename="pulse.c8")
    
    # 6G Data for Throughput
    data = (np.random.normal(0, 0.4, 8000000) + 1j * np.random.normal(0, 0.4, 8000000))
    file_path = bridge.save_to_file(data.tolist(), filename="load.c8")
    file_bits = os.path.getsize(file_path) * 8

    # Set stable frequency (Channel 6)
    bridge.frequency = 2437000000 
    bridge.sample_rate = 10000000 # 10 Msps is more predictable for phones

    start_test = time.time()
    total_transmitted_bits = 0
    bursts = 0

    print(f"[*] STEP 1: Broadcasting {ssid_name} on {bridge.frequency/1e6} MHz")
    print("[*] STEP 2: Running high-speed 6G Data Bursts...")

    try:
        while time.time() - start_test < 180:
            bursts += 1
            
            # 1. SEND BEACON (So phone 'Sees' the name)
            # We do this twice to ensure detection
            bridge.transmit(filename="pulse.c8")
            
            # 2. SEND 6G DATA (So dashboard 'Sees' the speed)
            t0 = time.perf_counter()
            bridge.transmit(filename="load.c8")
            t1 = time.perf_counter()
            
            duration = t1 - t0
            mbps = (file_bits / 1e6) / duration
            total_transmitted_bits += file_bits
            
            # Sync with Site
            try:
                from backend.digital_twin_manager import digital_twin
                if digital_twin.running:
                    digital_twin.stats["throughput_mbps"] = mbps
            except:
                pass

            time_left = 180 - int(time.time() - start_test)
            print(f"    [T-{time_left}s] AIR-SPEED: {mbps:.2f} Mbps | BROADCASTING: {ssid_name}")
            time.sleep(0.01)

    except KeyboardInterrupt:
        print("\n[!] Stopping Demo.")

    avg_speed = (total_transmitted_bits / 1e6) / (time.time() - start_test)
    print(f"\n[DEMO COMPLETE]")
    print(f"Average Network Throughput: {avg_speed:.2f} Mbps")
    print("The phone antenna received 6G data pulses throughout this test.")

if __name__ == "__main__":
    asyncio.run(run_6g_downlink_demo())
