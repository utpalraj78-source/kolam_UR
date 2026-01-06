
# 💎 Industry-Grade Telecom Pillars

This document describes the high-performance telecommunication features implemented in the **Kolam-FHSS Lab** to meet modern industry standards (5G/Wi-Fi 7).

## 1. Adaptive Modulation (QAM)
*   **Mechanism**: Quadrature Amplitude Modulation (**QAM-16**, **QAM-64**).
*   **Purpose**: Increases **Spectral Efficiency**. Instead of sending 1 bit per hop, the system packs up to 6 bits into a single complex "Symbol" by manipulating both the phase and amplitude of the carrier wave.
*   **Location**: `backend/telecom_logic.py` -> `qam_modulate`

## 2. CQI Feedback Loop
*   **Mechanism**: **Channel Quality Indicator (CQI)**.
*   **Purpose**: The receiver measures the SNR (Signal-to-Noise Ratio) and BER (Bit Error Rate) and sends a CQI value back to the sender. The sender then **automatically adjusts** its modulation:
    *   **Good Quality**: Switches to 64-QAM (Maximum Speed).
    *   **Poor Quality**: Switches to BPSK/QPSK (Maximum Reliability).
*   **Location**: `backend/telecom_logic.py` -> `calculate_cqi`

## 3. HARQ (Hybrid ARQ)
*   **Mechanism**: **Chase Combining**.
*   **Purpose**: If a message arrives corrupted, the receiver doesn't discard it. It stores the noisy version in a `HARQBuffer`. When the sender retransmits, the receiver **combines** the multiple noisy versions using majority voting to reconstruct the perfect message.
*   **Location**: `backend/telecom_logic.py` -> `HARQBuffer`

## 4. Multipath Mitigation (Guard Intervals)
*   **Mechanism**: **Cyclic Prefix (CP)**.
*   **Purpose**: Protects against **Intersymbol Interference (ISI)**. In real radio, signals bounce off walls (Multipath). The Cyclic Prefix adds a "guard time" between symbols, allowing echoes to die down before the next symbol is processed.
*   **Location**: `backend/telecom_logic.py` -> `add_cyclic_prefix`

## 5. Advanced Block Coding
*   **Mechanism**: Harmonized Block Padding (96-bit blocks).
*   **Purpose**: Ensures all components (FEC, Interleaver, and QAM) work in perfect synchronization. This block-based approach is similar to how 5G NR (New Radio) frames are structured for maximum alignment.

---

## Technical Comparison
| Feature | Basic Lab | **Industry-Ready Lab** |
| :--- | :--- | :--- |
| **Speed** | 1 bit / hop | **6 bits / symbol** |
| **Resilience** | Static | **Adaptive (CQI)** |
| **Error Handling** | Drop Packet | **Combine Packet (HARQ)** |
| **Physics** | Ideal | **Multipath Resilient (CP)** |

**Your Kolam-FHSS Idea is now mathematically prepared for real-world radio deployment.**
