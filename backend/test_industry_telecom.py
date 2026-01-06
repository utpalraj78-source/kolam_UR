
import sys
import os
import numpy as np

# Add parent directory to path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.telecom_logic import (
    qam_modulate, qam_demodulate,
    calculate_cqi, get_adaptive_params,
    HARQBuffer,
    add_cyclic_prefix, remove_cyclic_prefix
)
from backend.kolam_message_encoder import KolamMessageEncoder

def test_qam():
    print("\n--- Testing QAM Adaptive Modulation ---")
    bits = [1, 0, 1, 1, 0, 1, 0, 0] # 8 bits
    
    # Test QAM-16 (4 bits/symbol)
    symbols_16 = qam_modulate(bits, order=16)
    decoded_16 = qam_demodulate(symbols_16, order=16)
    print(f"QAM-16 Symbols: {symbols_16}")
    assert decoded_16 == bits
    
    # Test QAM-64 (6 bits/symbol)
    symbols_64 = qam_modulate(bits, order=64)
    decoded_64 = qam_demodulate(symbols_64, order=64)
    print(f"QAM-64 Symbols: {symbols_64}")
    # bits will be padded to 12 bits for QAM-64 (2 symbols)
    assert decoded_64[:8] == bits
    print("QAM Modulation Test Passed!")

def test_cqi_adaptive():
    print("\n--- Testing CQI Feedback Loop ---")
    # Simulation: Good channel
    cqi_good = calculate_cqi(snr=25, ber=0.0001)
    params_good = get_adaptive_params(cqi_good)
    print(f"Good Channel (CQI {cqi_good}): {params_good['modulation'] if 'modulation' in params_good else params_good['mod_order']}")
    assert params_good['mod_order'] == 64
    
    # Simulation: Poor channel
    cqi_poor = calculate_cqi(snr=4, ber=0.1)
    params_poor = get_adaptive_params(cqi_poor)
    print(f"Poor Channel (CQI {cqi_poor}): {params_poor['modulation'] if 'modulation' in params_poor else params_poor['mod_order']}")
    assert params_poor['mod_order'] == 2
    print("CQI Feedback Test Passed!")

def test_harq_combining():
    print("\n--- Testing HARQ Chase Combining ---")
    harq = HARQBuffer()
    packet_id = 101
    original_bits = [1, 0, 1, 0]
    
    # Version 1: Error at index 0
    harq.add_version(packet_id, [0, 0, 1, 0])
    # Version 2: Error at index 1
    harq.add_version(packet_id, [1, 1, 1, 0])
    # Version 3: Clean
    harq.add_version(packet_id, [1, 0, 1, 0])
    
    combined = harq.chase_combine(packet_id)
    print(f"Original: {original_bits}")
    print(f"Combined (HARQ): {combined}")
    assert combined == original_bits
    print("HARQ Combining Test Passed!")

def test_guard_interval():
    print("\n--- Testing Guard Intervals (Cyclic Prefix) ---")
    symbols = [complex(1,1), complex(2,2), complex(3,3)]
    with_cp = add_cyclic_prefix(symbols, cp_len=2)
    print(f"Symbols: {symbols}")
    print(f"With CP: {with_cp}")
    stripped = remove_cyclic_prefix(with_cp, cp_len=2)
    assert stripped == symbols
    print("Guard Interval Test Passed!")

def test_industry_encoder():
    print("\n--- Testing Full Industry-Ready Pipeline ---")
    message = "Industry-Ready Kolam"
    encoder = KolamMessageEncoder(channels=64, chunk_size=8)
    
    # Test High-Efficiency Mode (CQI 15)
    print("Testing 64-QAM Mode (CQI 15)...")
    encoded_high = encoder.encode_message_industry(message, cqi=15)
    decoded_high, errors = encoder.decode_message_industry(encoded_high, cqi=15)
    print(f"Decoded: {decoded_high}")
    assert decoded_high == message
    
    # Test Robust Mode (CQI 1)
    print("Testing BPSK Mode (CQI 1)...")
    encoded_low = encoder.encode_message_industry(message, cqi=1)
    decoded_low, errors = encoder.decode_message_industry(encoded_low, cqi=1)
    print(f"Decoded: {decoded_low}")
    assert decoded_low == message
    
    print("Full Industry Pipeline Passed!")

if __name__ == "__main__":
    try:
        test_qam()
        test_cqi_adaptive()
        test_harq_combining()
        test_guard_interval()
        test_industry_encoder()
        print("\n✅ ALL INDUSTRY-READY TESTS PASSED!")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

