# Signal Processing Metrics (SNR & BER)

## 1. The Theory
To evaluate the performance of any communication system, we use standard signal processing metrics:
- **Signal-to-Noise Ratio (SNR)**: The ratio of the power of the desired signal to the power of background noise.
  $$SNR_{dB} = 10 \log_{10} \left( \frac{P_{signal}}{P_{noise}} \right)$$
- **Bit Error Rate (BER)**: The percentage of bits that have errors (flipped from 0 to 1 or vice versa) after transmission.
- **Signal-to-Interference Ratio (SIR)**: Similar to SNR, but specifically measures the signal power against interference (jamming).

## 2. Where it is Used
These metrics are calculated in the simulation engine to validate the FHSS system:
- **Backend**: `backend/main.py` (The `simulate_effective_snr_ber` function).
- **Frontend**: `src/pages/AnalyticsPage.tsx` (Graphs and charts displaying these metrics).

## 3. Methodology
1.  **Simulation Loop**: We simulate the transmission of thousands of bits.
2.  **Channel Modeling**:
    - We add **Gaussian Noise** (AWGN) to simulate natural interference.
    - We add **Jamming Signals** to specific frequencies to simulate an attack.
3.  **Calculation**:
    - We compare the received bits with the original transmitted bits.
    - $BER = \frac{\text{Number of Error Bits}}{\text{Total Bits Sent}}$.
    - We vary the Jammer Power and User Power to see how BER changes.

## 4. Observation
- **SNR vs. BER**: As SNR increases (stronger signal), BER decreases exponentially (Waterfall curve).
- **Jamming Impact**: A narrowband jammer causes a "floor" in the BER curve—no matter how strong the signal is, if the jammer hits a hop, data is lost.
- **FHSS Advantage**: FHSS spreads the signal, so the "Jamming Floor" is much lower than in a fixed-frequency system.

## 5. Purpose in Project
These metrics provide the **Scientific Validation** for the project. They prove that the "Kolam-based FHSS" is not just a visual toy but a mathematically sound communication strategy that behaves consistently with real-world physics.
