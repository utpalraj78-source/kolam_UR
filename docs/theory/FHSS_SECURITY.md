# Frequency Hopping Spread Spectrum (FHSS)

## 1. The Theory
**Frequency Hopping Spread Spectrum (FHSS)** is a method of transmitting radio signals by rapidly changing the carrier frequency among many distinct frequencies occupying a large spectral band.
- **Spread Spectrum**: The signal is "spread" over a wider bandwidth than necessary.
- **Hopping Sequence**: The specific order of frequencies is determined by a pseudorandom code known only to the transmitter and receiver.
- **Anti-Jamming**: Narrowband interference (jamming) only affects a small fraction of the hops, allowing the signal to be recovered via error correction.

## 2. Where it is Used
This is the core communication protocol simulated in the application:
- **Backend**: `backend/fhss_chat.py` (Message encoding/decoding), `backend/main.py` (Simulation logic).
- **Frontend**: `src/pages/KolamChat.tsx` (Visualizing the hops), `src/pages/FrequencyHopping.tsx`.

## 3. Methodology
1.  **Key Derivation**: We convert the Kolam Matrix ($M$) into a binary stream ($B$).
2.  **Channel Selection**: We divide the available bandwidth into $N$ channels (e.g., 64).
3.  **Hopping Logic**:
    - At time $t$, the frequency $f_t$ is chosen using a chunk of bits from the Kolam key.
    - $Channel(t) = \text{KolamBits}(t) \mod N$.
4.  **Transmission**: The message is split into packets, and each packet is sent on a different frequency channel according to the sequence.

## 4. Observation
- **Security**: Without the Kolam key, an interceptor sees only random noise across the spectrum. They cannot predict the next frequency.
- **Robustness**: In our simulations (`backend/main.py`), we observe that even if a jammer blocks 20% of the channels, the message can often still be reconstructed (especially if Error Correction Codes are added).

## 5. Purpose in Project
FHSS provides the **Security Layer**. It demonstrates how traditional cultural patterns (Kolam) can be used as high-entropy seeds for modern cryptographic systems. The project visualizes this invisible process, showing how the "dance" of frequencies matches the "dance" of the Kolam lines.
