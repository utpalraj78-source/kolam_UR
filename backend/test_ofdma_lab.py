
import sys
import os
import numpy as np

# Add parent directory to path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.telecom_logic import (
    allocate_ofdma_resource_block,
    fh_ofdma_encode_pipeline,
    fh_ofdma_decode_pipeline
)
from backend.kolam_message_encoder import KolamMessageEncoder

def test_ofdma_allocation():
    print("\n--- Testing parallel OFDMA Resource Block Allocation ---")
    kolam_row = [1, 2, 3, 4, 5, 6, 7, 8]
    total_sc = 64
    block_size = 4
    blacklist = [10, 11, 12, 13]
    
    # Try getting a block
    block = allocate_ofdma_resource_block(kolam_row, total_sc, block_size, blacklist)
    print(f"Kolam Row Sum Map: {sum(kolam_row) % total_sc}")
    print(f"Allocated Block: {block}")
    
    assert len(block) == block_size
    for sc in block:
        assert sc not in blacklist
    print("OFDMA Allocation Test Passed!")

def test_full_ofdma_pipeline():
    print("\n--- Testing Full Kolam FH-OFDMA Parallel Pipeline ---")
    message = "Parallel Kolam 5G"
    encoder = KolamMessageEncoder(channels=32, chunk_size=16)
    
    # Blacklist some parts of the spectrum
    blacklist = [5, 15, 25]
    
    # Encode
    print("Encoding with parallel sub-carriers...")
    encoded_chunks = encoder.encode_message_ofdma(message, cqi=15, blacklist=blacklist)
    
    # Check if first chunk uses multiple subcarriers per slot
    first_frame = encoded_chunks[0]["ofdma_frames"][0]
    print(f"Slot 0 Subcarriers: {first_frame['subcarriers']}")
    assert len(first_frame['subcarriers']) == 8
    
    # Verify no blacklisted channels in any frame
    for chunk in encoded_chunks:
        for frame in chunk["ofdma_frames"]:
            for sc in frame["subcarriers"]:
                if sc in blacklist:
                    raise ValueError(f"Blacklisted subcarrier {sc} found in OFDMA grid!")
    
    # Decode
    print("Decoding parallel grid...")
    decoded_message = encoder.decode_message_ofdma(encoded_chunks)
    print(f"Original: {message}")
    print(f"Decoded: {decoded_message}")
    
    assert decoded_message == message
    print("FH-OFDMA Lab Test Passed!")

if __name__ == "__main__":
    try:
        test_ofdma_allocation()
        test_full_ofdma_pipeline()
        print("\n✅ ALL FH-OFDMA PARALLEL TESTS PASSED!")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

