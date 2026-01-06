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

@router.post("/matrix-to-hops")
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
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"matrix-to-hops failed: {e}")
