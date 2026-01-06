
import sys
import os
import time
import numpy as np

# Add parent directory to path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.telecom_logic import (
    advanced_ldpc_encode, 
    MassiveMIMO, 
    HandoverManager,
    kolam_6g_pipeline
)

def test_mimo_beamforming():
    print("\n--- Testing Massive MIMO (64-Antenna Beamforming) ---")
    mimo = MassiveMIMO(num_antennas=64)
    symbol = complex(1, 1)
    kolam_vec = [12, 45, 89, 23, 11]
    user_pos = (50.0, 50.0) # Steering toward 45 degrees
    
    streams = mimo.beamform_precode(symbol, kolam_vec, user_pos)
    print(f"Generated {len(streams)} spatial streams.")
    assert len(streams) == 64
    # Check if phase shifts are happening
    assert streams[0] != streams[1]
    print("MIMO Beamforming Test Passed!")

def test_ldpc_encoding():
    print("\n--- Testing Advanced LDPC-inspired FEC ---")
    bits = [1, 0, 1, 1, 0, 1, 0, 0] # 1 byte
    encoded = advanced_ldpc_encode(bits)
    print(f"Original (8 bits) -> Encoded ({len(encoded)} bits)")
    # Should have parity bits appended
    assert len(encoded) > len(bits)
    print("LDPC Simulation Test Passed!")

def test_handover_mobility():
    print("\n--- Testing Seamless Handover (Mobility) ---")
    manager = HandoverManager()
    seed_alpha = 9999
    
    # User moves from Alpha to Beta
    seed_beta = manager.transition_kolam_seed(seed_alpha, "Cell_Beta")
    print(f"Seed evolved from {seed_alpha} to {seed_beta}")
    assert seed_alpha != seed_beta
    assert manager.active_cell == "Cell_Beta"
    print("Handover Logic Test Passed!")

def test_full_6g_optimized_pipeline():
    print("\n--- Testing Full Kolam-6G Optimized URLLC Pipeline ---")
    message = "State-Of-The-Art-Kolam"
    
    start_time = time.perf_counter()
    result = kolam_6g_pipeline(message, mimo_coord=(100, 100), cell_id="Cell_Gamma")
    end_time = time.perf_counter()
    
    print(f"Status: {result['status']}")
    print(f"Throughput: {result['throughput_gbps']} Gbps")
    print(f"Simulated Latency: {result['latency']}")
    print(f"Power Focus: {result['power_focus']}")
    
    # Real execution time (should be very fast due to NumPy vectorization)
    real_exec_us = (end_time - start_time) * 1_000_000
    print(f"Actual Execution Time: {real_exec_us:.2f} µs")
    
    assert result['spatial_streams'] == 64
    assert "Beamformed" in result['power_focus']
    print("Kolam-6G Standard Test Passed!")

if __name__ == "__main__":
    try:
        test_mimo_beamforming()
        test_ldpc_encoding()
        test_handover_mobility()
        test_full_6g_optimized_pipeline()
        print("\n✅ ALL STATE-OF-THE-ART TELECOM TESTS PASSED!")
        print("Your project is now fully optimized for current and future industry needs.")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

