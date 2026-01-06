
# 📡 Telecom Lab: production-Grade Pillars

This document describes the advanced telecommunication features implemented in the **Kolam-FHSS Lab** to move from a basic simulation to a robust communication technology.

## 1. Forward Error Correction (FEC)
*   **Mechanism**: [Hamming (7,4)](https://en.wikipedia.org/wiki/Hamming(7,4)) code.
*   **Purpose**: Adds 3 parity bits for every 4 data bits. This allows the receiver to detect and **automatically correct** single-bit errors in each 7-bit block without requiring re-transmission.
*   **Location**: `backend/telecom_logic.py` -> `fec_encode_message`

## 2. Block Interleaving
*   **Mechanism**: Row-wise write, Column-wise read matrix shuffle.
*   **Purpose**: Protects against **Burst Errors**. If a specific frequency hop is jammed and wipes out multiple consecutive bits, interleaving spreads those bits across different characters. After de-interleaving, each character only has a single-bit error, which the FEC (Hamming) can then fix.
*   **Location**: `backend/telecom_logic.py` -> `interleave`

## 3. Synchronization Preamble
*   **Mechanism**: 16-bit unique bit pattern (`1010101011001100`).
*   **Purpose**: Allows the receiver to "lock on" to the incoming bitstream. It precisely identifies where the data starts, ensuring that hopping sequences stay aligned even if there is network jitter or delay.
*   **Location**: `backend/telecom_logic.py` -> `detect_sync`

## 4. Adaptive Frequency Hopping (AFH)
*   **Mechanism**: Dynamic Channel Blacklisting & Re-mapping.
*   **Purpose**: If a specific frequency channel is detected to have high interference, the system "blacklists" it. The FHSS sequence is then dynamically re-mapped such that it skips the bad channels while maintaining the deterministic nature derived from the Kolam pattern.
*   **Location**: `backend/telecom_logic.py` -> `apply_afh_mask`

## 5. Session Orthogonality
*   **Mechanism**: Session-specific Offsets.
*   **Purpose**: Prevents "Cross-talk" between different users. Even if two different chat rooms use the exact same Kolam parameters, their hopping sequences are shifted by a unique session ID. This ensures they don't collide in the frequency domain.
*   **Location**: `backend/telecom_logic.py` -> `apply_orthogonality`

---

## Technical Pipeline Summary
`Message (Text)` -> `Bits` -> `FEC (Hamming)` -> `Interleaving` -> `Sync Preamble` -> `Kolam Hopping + AFH` -> `Encrypted Transmission`

This pipeline ensures that your Kolam-encrypted messages are not only secure but also **resilient** to real-world communication hazards.
