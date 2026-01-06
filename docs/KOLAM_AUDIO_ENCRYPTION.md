# Kolam Audio Encryption & Transmission Protocol

This document outlines the novel encryption and transmission protocol used in the Kolam FHSS Lab application. Instead of traditional AES encryption or simple noise masking, this protocol embeds audio data directly into the geometric structure of a Kolam pattern.

## Overview

The core concept is **"Security through Structure"**. Audio data is not just "hidden" behind noise; it is transformed into the edges of a Kolam graph. To decode the audio, one must know the specific graph topology (grid size $k$) and the mapping rules.

## The Pipeline

### 1. Audio Capture & Quantization
*   **Input**: Raw audio from the microphone is captured in chunks (e.g., 4096 samples).
*   **Format**: 32-bit Floating Point (Float32), range $[-1.0, 1.0]$.
*   **Quantization**: Each sample is quantized to an 8-bit integer (Uint8, range $0-255$).
    *   This reduces bandwidth while maintaining acceptable voice quality.

### 2. Bitstream Conversion
*   The array of Uint8 samples is converted into a continuous bitstream.
*   Total Bits $N = \text{NumSamples} \times 8$.

### 3. Kolam Grid Sizing
*   A Kolam pattern is defined on a grid of points. The "edges" between these points can be either present (1) or absent (0).
*   For a grid of size $k \times k$, the number of available edges is $2k(k+1)$ (horizontal + vertical edges).
*   We dynamically calculate the minimum grid size $k$ required to store the $N$ bits of audio data:
    $$ 2k(k+1) \ge N $$

### 4. Structural Encoding (The "Encryption")
*   The bitstream is mapped directly onto the edges of the Kolam grid.
*   **Rows**: The first set of bits populates the horizontal edges.
*   **Cols**: The remaining bits populate the vertical edges.
*   This transforms the temporal audio signal into a spatial geometric pattern.
*   **Payload**: The data is transmitted not as a byte array, but as a sparse matrix representation of the Kolam:
    ```json
    {
      "type": "audio_kolam",
      "k": 32,
      "rows": [[1,0,1...], ...],
      "cols": [[0,1,1...], ...]
    }
    ```

### 5. Frequency Hopping (FHSS)
*   To prevent interception, each chunk is transmitted on a different frequency channel.
*   **Channel Selection**: The channel for a given chunk is determined by a pseudo-random sequence derived from the session's **Kolam Hybrid Key**.
*   **Hopping Logic**: We aggregate multiple bits from the key stream to ensure uniform distribution across all available channels (e.g., 64 channels), ensuring the system utilizes the full spectrum even if the base key consists of single bits.

### 6. Reception & Reconstruction
*   The receiver listens on the correct channel (synchronized via the Room ID/Key).
*   Upon receiving the `audio_kolam` payload:
    1.  **Extract Edges**: The `rows` and `cols` arrays are read.
    2.  **Reassemble Bits**: Edges are concatenated back into the bitstream.
    3.  **Dequantize**: Bits $\to$ Uint8 $\to$ Float32.
    4.  **Playback**: The reconstructed audio chunk is played.

## Security Properties

1.  **Obfuscation**: An interceptor sees only JSON describing a graph, not recognized audio headers or PCM data.
2.  **Hopping**: Without the session key, an interceptor cannot follow the sequence of channels to reassemble the chunks in order.
3.  **Geometric Binding**: The data is bound to the validity of the Kolam structure. Future enhancements can enforce symmetry constraints to further validate data integrity (i.e., only "valid" Kolams are accepted).
