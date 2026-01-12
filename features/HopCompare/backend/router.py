from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
import math
import os
import sys

# Adjust path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from backend.utils import M_to_nibble_matrix, nibble_matrix_to_bits, bits_to_hops

router = APIRouter()

class HopsRequest(BaseModel):
    matrix: list
    channels: int = 16
    bits_per_hop: int = 4
    strategy: str = "bits_chunk"
    msb_first: bool = True

class SingleHopRequest(BaseModel):
    channel: int

@router.post("/transmit-single-hop")
def transmit_single_hop(req: SingleHopRequest):
    """Transmit a single burst on the specified channel (Real-time sync)."""
    try:
        from backend.hackrf_bridge import HackRFBridge
        bridge = HackRFBridge()
        if bridge.available:
            base_freq = 2400000000
            freq_hz = base_freq + (req.channel * 5000000)
            bridge.frequency = int(freq_hz)
            
            # Longer burst for visibility (200k samples @ 2Msps = 100ms)
            # This ensures the TX LED has time to light up
            dummy_signal = (np.random.normal(0, 0.7, 200000) + 1j * np.random.normal(0, 0.7, 200000))
            bridge.save_to_file(dummy_signal.tolist(), filename="live_hop.c8")
            
            print(f"[HopCompare] Transmitting Single Hop on Ch {req.channel} ({freq_hz/1e6} MHz)")
            bridge.transmit(filename="live_hop.c8")
            return {"status": "transmitted", "freq": freq_hz}
        return {"status": "simulated_only"}
    except Exception as e:
        print(f"Tx Error: {e}")
        return {"status": "error"}
def matrix_to_hops_endpoint(req: HopsRequest):
    """Convert a loaded Kolam matrix to a hopping sequence."""
    try:
        # Load logic
        try:
            arr = np.array(req.matrix)
            # Detect dimension & type
            if arr.ndim == 3:
                # e.g. (12,12,4)
                nibble = M_to_nibble_matrix(arr)
            elif arr.ndim == 2:
                # e.g. (12,12) already nibbles?
                nibble = arr
            else:
                # (N*N*4) flat?
                k = int(math.sqrt(len(req.matrix) / 4))
                arr = arr.reshape((k, k, 4))
                nibble = M_to_nibble_matrix(arr)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid matrix format: {e}")

        channels = req.channels
        bits_per_hop = req.bits_per_hop

        strategy = (req.strategy or "bits_chunk").lower()
        # HackRF Integration for Physical Validation
        # When user compares hops, we physically transmit the first sequence
        try:
            from backend.hackrf_bridge import HackRFBridge
            bridge = HackRFBridge()
            if bridge.available:
                final_seq = []
                if strategy == "nibble_mod":
                    per_cell_arr = (nibble % max(1, channels)).astype(int)
                    final_seq = [int(x) for x in per_cell_arr.flatten().tolist()]
                else:
                    bits = nibble_matrix_to_bits(nibble, msb_first=bool(req.msb_first))
                    hops = bits_to_hops(bits, channels, bits_per_hop, msb_first=bool(req.msb_first))
                    final_seq = [int(x) for x in np.array(hops).flatten().tolist()]

                # Generate a physical burst representing this sequence
                # We replicate the 'Adaptive Hopping Experiment' logic:
                # Transmit a burst on each frequency in the sequence
                print(f"[HopCompare] Transmitting Sequence via HackRF ({len(final_seq)} hops)...")
                
                # 1. Create a reusable signal burst
                dummy_signal = (np.random.normal(0, 0.7, 2000) + 1j * np.random.normal(0, 0.7, 2000))
                burst_file = bridge.save_to_file(dummy_signal.tolist(), filename="hop_compare.c8")
                
                # 2. Transmit the first 10 hops (to avoid blocking UI too long)
                # Ideally this would be a background task
                for i, channel_idx in enumerate(final_seq[:10]):
                    # Map Channel -> Frequency (2.4 GHz + Ch*5MHz)
                    base_freq = 2400000000
                    freq_hz = base_freq + (channel_idx * 5000000)
                    
                    bridge.frequency = int(freq_hz)
                    print(f"    -> [Hop {i}] Ch {channel_idx} ({freq_hz/1e6} MHz)")
                    bridge.transmit(filename="hop_compare.c8")
                    
        except Exception as hardware_err:
            print(f"[HopCompare] Hardware Tx Skipped: {hardware_err}")

        if strategy == "nibble_mod":
            per_cell_arr = (nibble % max(1, channels)).astype(int)
            seq = [int(x) for x in per_cell_arr.flatten().tolist()]
            return {
                "strategy": "nibble_mod",
                "channels": channels,
                "bits_per_hop": bits_per_hop,
                "matrix_nibble": per_cell_arr.tolist(),
                "per_cell_hops": per_cell_arr.tolist(),
                "hops_sequence": seq,
                "length": len(seq),
                "hardware_status": "Transmitted 10-hop burst via HackRF" if 'bridge' in locals() and bridge.available else "Simulation Only"
            }
        else:
            bits = nibble_matrix_to_bits(nibble, msb_first=bool(req.msb_first))
            hops = bits_to_hops(bits, channels, bits_per_hop, msb_first=bool(req.msb_first))
            hops_list = [int(x) for x in np.array(hops).flatten().tolist()]
            return {
                "strategy": "bits_chunk",
                "channels": channels,
                "bits_per_hop": bits_per_hop,
                "matrix_nibble": nibble.astype(int).tolist(),
                "bits_length": int(bits.size),
                "hops_sequence": hops_list,
                "length": len(hops_list),
                "hardware_status": "Transmitted 10-hop burst via HackRF" if 'bridge' in locals() and bridge.available else "Simulation Only"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"matrix-to-hops failed: {e}")
