
import sys
import os

# Add parent directory to path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.telecom_logic import (
    RRCManager,
    NetworkSlicer,
    ntn_doppler_compensate,
    kolam_enterprise_standard_pipeline
)

def test_3gpp_signaling():
    print("\n--- Testing 3GPP RRC Control Plane ---")
    rrc = RRCManager()
    status = rrc.rrc_setup_request(ue_id="UE-ID-99-ALPHA")
    print(f"RRC State: {rrc.state}, Attachment: {status}")
    assert status == "RRC_SETUP_COMPLETE"
    assert rrc.config["ciphering"] == "NEA2-AES"
    print("3GPP Signaling Test Passed!")

def test_network_slicing():
    print("\n--- Testing 5G/6G Network Slicing ---")
    slicer = NetworkSlicer()
    # Test high-reliability slice
    slice_data = slicer.allocate_slice("URLLC")
    print(f"Allocated Slice SST: {slice_data['sst']}")
    assert slice_data['sst'] == 2
    # Test IoT slice
    slice_iot = slicer.allocate_slice("mIoT")
    assert slice_iot['sst'] == 3
    print("Network Slicing Test Passed!")

def test_ntn_satellite_compensation():
    print("\n--- Testing NTN Doppler Compensation (Starlink Speed) ---")
    freq = 3.5e9 # 3.5 GHz
    velocity = 7500 # 7.5 km/s (LEO Satellite speed)
    comp_freq = ntn_doppler_compensate(freq, velocity)
    print(f"Original: {freq/1e9}GHz -> Compensated: {comp_freq/1e9:.6f}GHz")
    assert comp_freq < freq # Doppler shift for receding/approaching satellite
    print("NTN Doppler Test Passed!")

def test_full_enterprise_deployment():
    print("\n--- Testing FULL ENTERPRISE 2025/2026 PIPELINE ---")
    result = kolam_enterprise_standard_pipeline(
        ue_id="Factory-Bot-7", 
        use_case="URLLC", 
        is_satellite=True
    )
    
    print(f"Attachment: {result['ue_status']}")
    print(f"Slice: {result['active_slice']} (SST {result['sst_id']})")
    print(f"Link: {result['link_type']}")
    print(f"Compliance: {result['compliance']}")
    print(f"Readiness: {result['readiness']}")
    
    assert result['readiness'] == "Commercial Deployment Ready"
    assert "Satellite" in result['link_type']
    print("\n✅ GLOBAL ENTERPRISE DEPLOYMENT TESTS PASSED!")

if __name__ == "__main__":
    try:
        test_3gpp_signaling()
        test_network_slicing()
        test_ntn_satellite_compensation()
        test_full_enterprise_deployment()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
