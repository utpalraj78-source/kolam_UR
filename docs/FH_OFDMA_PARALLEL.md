
# ⚡ Kolam FH-OFDMA: Parallel 5G Advanced

This document describes the implementation of **Frequency-Hopping Orthogonal Frequency Division Multiple Access (FH-OFDMA)** using Kolam resource grids.

## 1. Parallel Transmission (The Throughput Leap)
*   **Mechanism**: **OFDMA (Orthogonal Frequency Division Multiple Access)**.
*   **Implementation**: Instead of sending data on a single frequency hop, the system simultaneously uses **8 sub-carriers** in parallel. This allows a single message chunk to be transmitted in a fraction of the time, effectively multiplying throughput by 8x.
*   **Location**: `backend/telecom_logic.py` -> `fh_ofdma_encode_pipeline`

## 2. Resource Grid Allocation (Kolam-Driven)
*   **Mechanism**: **Resource Block (RB)** mapping.
*   **Implementation**: The Kolam matrix is treated as a **Resource Grid**. Each row of the Kolam determines the specific "Sub-carrier Group" that will be used for a given time slot. This makes the parallel allocation both deterministic and encrypted at the physical layer.
*   **Location**: `backend/telecom_logic.py` -> `allocate_ofdma_resource_block`

## 3. Parallel Adaptive Frequency Hopping (AFH)
*   **Mechanism**: Parallel Blacklist Filtering.
*   **Implementation**: In every time slot, the system checks all 8 sub-carriers in the block. If any sub-carrier falls into a blacklisted (jammed) range, the system dynamically reroutes that specific sub-carrier to a safe frequency without breaking the parallel stream.
*   **Location**: `backend/telecom_logic.py` -> `allocate_ofdma_resource_block`

## 4. Harmonized Data Frames
*   **Implementation**: Data is packed into **96-bit base blocks** to ensure that FEC (Hamming), Interleaving (Block-8), and QAM-64 modulation align perfectly with the 8 parallel sub-carriers. This is a "Zero-Waste" allocation strategy similar to 5G NR frame structures.

---

## Technical Performance Breakdown
| Feature | Basic FHSS | **Parallel FH-OFDMA** |
| :--- | :--- | :--- |
| **Simultaneous Channels** | 1 | **8** |
| **Logic Type** | Serial | **Parallel Resource Grid** |
| **Scaling** | Linear | **Logarithmic (Spectral Efficiency)** |
| **Interference** | Frequency-based | **Resource Block-based** |

**The Kolam-FHSS Lab has now reached the level of modern 5G/6G physical layer logic.**
