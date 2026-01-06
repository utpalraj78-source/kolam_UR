# Frequency Hopping Spread Spectrum (FHSS)

**FHSS** is a method of transmitting radio signals by rapidly changing the carrier frequency among many distinct frequencies occupying a large spectral band.

## Key Concepts

1.  **Hopping Sequence**: The specific order in which frequencies are used. This sequence must be known to both the transmitter and receiver.
2.  **Synchronization**: Both parties must hop to the same frequency at the same time.
3.  **Interference Resistance**: Because the signal doesn't stay on one frequency for long, it is resistant to narrowband interference and jamming.
4.  **Security**: Without knowing the hopping sequence (which acts as a key), an eavesdropper only hears brief bursts of noise on random frequencies.

## In This Project
We simulate FHSS for secure chat:
*   **Channels**: We use 16 virtual channels (0-15).
*   **Key**: The **Kolam Matrix** serves as the shared secret key that determines the hopping sequence.
*   **Visualization**: The chat interface visualizes this hopping behavior in real-time.
