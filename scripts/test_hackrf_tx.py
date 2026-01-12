
import os
import sys
import time
import numpy as np

# Ensure backend modules are found
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'backend'))

# Fix: Explicitly handle the sibling import issue if run as script
try:
    from backend.telecom_logic import ORAN_RadioUnit_RU, qam_modulate, fec_encode_message
except ImportError:
    # Fallback for some python envs
    from telecom_logic import ORAN_RadioUnit_RU, qam_modulate, fec_encode_message

def run_encryption_test():
    """
    Generates a burst of Kolam-Encrypted data and transmits it via HackRF.
    """
    print("----------------------------------------------------------------")
    print("📡 KOLAM-FHSS ENCRYPTION TESTBENCH (LIVE FIRE)")
    print("----------------------------------------------------------------")
    
    # 1. Setup Data
    message = "KOLAM_SECURE_LINK_INIT_V1"
    print(f"[1] Encrypting Message: '{message}'")
    
    # Convert to bits
    bits = [int(b) for char in message for b in format(ord(char), '08b')]
    
    # 2. Scramble / Encode (Simulation of Logic)
    # Apply FEC (Hamming)
    encoded_bits = fec_encode_message(bits)
    print(f"[2] FEC Applied. Bitstream length: {len(encoded_bits)}")
    
    # 3. Modulate (QAM-16)
    symbols = qam_modulate(encoded_bits, order=16)
    print(f"[3] QAM Modulation -> {len(symbols)} Complex Symbols generated")
    
    # 4. Initialize Hardware
    print("[4] Initializing Radio Unit (RU)...")
    ru = ORAN_RadioUnit_RU()
    
    # 5. Transmit (This triggers the HackRFBridge)
    # We repeat the burst to make it audible/visible on a spectrum analyzer
    print("[5] TRANSMITTING BURST SEQUENCE (Press Ctrl+C to stop)...")
    
    try:
        # Create a sufficient buffer of data (repeat symbols)
        iq_stream = np.array(symbols * 50) # 50 repeats of the message
        
        # Add some noise to simulate air interface if needed, or purely clean
        # iq_stream += (np.random.normal(0, 0.05, len(iq_stream)) + 1j * np.random.normal(0, 0.05, len(iq_stream)))
        
        count = 0
        while count < 5: # Transmit 5 bursts
            print(f"    >> Firing Burst {count+1}/5...")
            ru.process_iq_samples(iq_stream)
            time.sleep(0.5) # Gap between bursts
            count += 1
            
        print("✅ Test Sequence Complete.")
        
    except KeyboardInterrupt:
        print("\nTransmission Aborted.")

if __name__ == "__main__":
    run_encryption_test()
