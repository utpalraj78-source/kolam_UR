
import sys
import os
import numpy as np

# Add parent directory to path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.telecom_logic import (
    simulate_isac_sensing,
    SmartSurfaceRIS,
    NeuralReceiver,
    apply_thz_physics,
    generate_pqc_header,
    kolam_ultra_6g_final_pipeline
)

def test_isac_sensing():
    print("\n--- Testing ISAC (Integrated Sensing & Comm) ---")
    sig = [complex(1,1)]
    dist = 30.0 # 30 meters
    report = simulate_isac_sensing(sig, dist)
    print(f"Target at {dist}m, Echo Delay: {report['echo_delay_us']}us")
    assert report['object_detected'] == True
    assert report['distance_m'] == dist
    print("ISAC Sensing Test Passed!")

def test_ris_boost():
    print("\n--- Testing RIS (Smart Surface Reflection) ---")
    ris = SmartSurfaceRIS()
    snr_init = 20.0
    snr_boosted = ris.reflect_and_boost(snr_init)
    print(f"Initial SNR: {snr_init}dB -> RIS Boosted: {snr_boosted}dB")
    assert snr_boosted > snr_init
    print("RIS Surface Test Passed!")

def test_neural_receiver():
    print("\n--- Testing AI-Native Neural Receiver ---")
    rx = NeuralReceiver()
    symbols = [complex(0.7, 0.7), complex(-0.7, -0.7)]
    predicted_bits = rx.decode_neural(symbols)
    print(f"Neural predicted {len(predicted_bits)} bits from {len(symbols)} symbols.")
    assert len(predicted_bits) == 8 # 2 symbols * 4 bits (simulated 16-QAM)
    print("Neural Receiver Test Passed!")

def test_thz_physics():
    print("\n--- Testing THz Atmospheric Absorption ---")
    # Clean air
    pwr_clean = apply_thz_physics(power_db=30, distance_km=0.1, humidity=0.1)
    # Raining air
    pwr_rain = apply_thz_physics(power_db=30, distance_km=0.1, humidity=0.9)
    print(f"THz Power (Clean): {pwr_clean:.2f}dB")
    print(f"THz Power (Rain): {pwr_rain:.2f}dB")
    assert pwr_rain < pwr_clean
    print("THz Physics Test Passed!")

def test_pqc_security():
    print("\n--- Testing PQC (Post-Quantum Cryptography) ---")
    seed = 123456
    header = generate_pqc_header(seed)
    print(f"Generated PQC Header: {header}")
    assert "PQC-LATTICE" in header
    print("PQC Security Test Passed!")

def test_ultra_6g_peak_pipeline():
    print("\n--- Testing THE ULTIMATE KOLAM-QUANTUM-6G PIPELINE ---")
    message = "Future Of Humanity"
    result = kolam_ultra_6g_final_pipeline(message, target_m=50.0, weather_rain=True)
    
    print(f"Standard: {result['standard']}")
    print(f"Security: {result['security']}")
    print(f"Sensing: Object found at {result['sensing_report']['distance_m']}m")
    print(f"RIS: {result['ris_boost']}")
    print(f"Physics: {result['thz_status']}")
    print(f"Sample Header: {result['pqc_header_sample']}")
    
    assert "6G-Quantum" in result['standard']
    assert result['sensing_report']['object_detected'] == True
    print("\n✅ ULTIMATE 6G INDUSTRY-READY TESTS PASSED!")

if __name__ == "__main__":
    try:
        test_isac_sensing()
        test_ris_boost()
        test_neural_receiver()
        test_thz_physics()
        test_pqc_security()
        test_ultra_6g_peak_pipeline()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
