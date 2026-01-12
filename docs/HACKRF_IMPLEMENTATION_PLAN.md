# Implementation Plan: Kolam-Encrypted Transmission via HackRF

This document outlines the roadmap for integrating the HackRF One SDR with the Kolam-FHSS backend. The goal is to utilize Kolam's chaotic functions to encrypt and frequency-hop radio signals in the 2.4GHz (Wi-Fi) ISM band.

## 1. Concept: "Kolam-Encrypted Wi-Fi" vs. Standard Wi-Fi

It is important to clarify the distinct approaches:

*   **Approach A (Standard 802.11):** Encrypting standard Wi-Fi frames. This typically requires kernel-level drivers (mac80211) and is difficult to do with just a HackRF in Python.
*   **Approach B (Custom Kolam PHY - **Recommended**):** Creating a custom "Physical Layer" that operates in the 2.4GHz band. To standard Wi-Fi devices, this signal looks like random noise. Only a receiver with the correct Kolam Key can decode it. This effectively creates an "invisible" encrypted network.

**We will proceed with Approach B**, as it leverages the core strength of the Kolam project (custom frequency hopping).

## 2. Architecture Overview

### A. The Signal Chain
1.  **Input Data**: User text or binary data.
2.  **Kolam Scrambling**: Data is XOR-masked using `telecom_logic.py`'s Kolam Generator.
3.  **Modulation (QAM)**: Bits are converted to Complex Symbols (I/Q).
4.  **Frequency Hopping**: The carrier frequency is not static; it hops based on the Kolam grid.
5.  **DAC Conversion**: Complex float values are converted to Signed-8-bit integers (CS8) required by HackRF.
6.  **Transmission**: `hackrf_transfer` sends the CS8 samples to the airwaves.

### B. New Components (Prototype Stage)
*   **`backend/hackrf_bridge.py`**: (Created) A Python wrapper that detects the HackRF and converts native Python complex numbers into the binary format (`.c8`) expected by the hardware.
*   **`backend/hardware_drivers.py`**: (Modified) Updated to include `SDRInterface`, allowing the main application to "switch" between simulation and real hardware easily.

## 3. Detailed Implementation Phases

### Phase 1: Hardware Verification (Done/In-Progress)
*   [x] Create `HackRFBridge` class.
*   [x] Initial check for `hackrf_transfer` command line tool.
*   [ ] User Step: Install HackRF tools on Windows (`choco install hackrf` or manual PATH setup).
*   [ ] Test: Verify simple carrier signal transmission.

### Phase 2: IQ generation & Formatting
*   **Task**: Implement a converter that takes the `QAM` symbols from `telecom_logic.py` and produces a valid `.c8` file.
*   **Challenge**: Scaling. HackRF expects values -128 to 127. Floating point IQs must be normalized.
*   **Solution**: `HackRFBridge.save_to_file` already implements `np.array(samples) * 127.0`.

### Phase 3: Frequency Hopping Logic (The "Kolam" Part)
*   **Task**: Instead of transmitting on one frequency (e.g., 2.45 GHz), the system must rapidly retune.
*   **Implementation**:
    *   Generate a `Hop Sequence` using `features/FrequencyHopping`.
    *   Split the data into small chunks (bursts).
    *   Transmit Burst 1 at Freq A, Burst 2 at Freq B, etc.
*   **Note**: HackRF has a retuning latency (~150us). We must account for this in the data rate.

### Phase 4: Receiver & Decryption
*   **Task**: Verify the signal can be recovered.
*   **Implementation**:
    *   Record a spectrum capture using HackRF (`hackrf_transfer -r`).
    *   Load `.c8` file into Python.
    *   Apply the *inverse* Kolam Key to unscramble.
    *   Demodulate QAM back to text.

## 4. Integration with Frontend
*   Add a toggle in the UI: **"Transmit via True-RF"**.
*   When enabled, the backend calls `SDRInterface` instead of just returning JSON simulation data.
*   Show a "Transmission Active" indicator on the dashboard.

## 5. Safety & Compliance
*   **WARNING**: The 2.4GHz band is unregulated but has power limits.
*   **Action**: Always use low gain (`-a 0 -x 20`) for lab tests.
*   **Action**: Do not interfere with residential Wi-Fi. Ensure the hopping sequence avoids the specific channel your home router is using.

## 6. Next Steps
1.  **User Approval**: Please review this plan.
2.  **Tool Installation**: Ensure `hackrf_transfer` works in your terminal.
3.  **Code Connection**: I will wire up the `telecom_logic` to the `HackRFBridge` once approved.
