# Implementation Plan: Real-Time Kolam-Encrypted Voice Calling

## 1. Overview
We will implement a real-time voice call feature where audio is "masked" (encrypted) by adding a deterministic noise wave derived from Kolam patterns. This ensures that anyone intercepting the stream hears only noise unless they possess the correct Kolam parameters to subtract that noise.

## 2. Architecture

### A. The "Kolam Wave" (Noise Generator)
To satisfy the requirement of "deriving a mathematical wave from the Kolam matrix":
1.  **Input:** A shared `Kolam Matrix` (generated from the room's shared seed).
2.  **Process:**
    *   The Kolam Matrix (e.g., 16x16 or 64x64) is treated as a **Spectrogram** or **Wavetable**.
    *   We flatten the `hybrid_key` (which is already a mix of Kolam structure and randomness) into a normalized float array [-1.0, 1.0].
    *   This array acts as a **Circular Noise Buffer**.
3.  **Dynamic Variation:**
    *   To prevent the noise from being a simple repeating loop, we rotate/shift the buffer offset based on the `chunk_index` of the audio.

### B. Signal Processing Pipeline (Client-Side)
We will use the **Web Audio API** with a `ScriptProcessorNode` (or `AudioWorklet` for better performance) to intercept and modify audio samples.

**Sender (Encryption):**
1.  **Capture:** Microphone Input -> `Float32Array` (Chunk).
2.  **Generate Noise:** `Noise_Chunk = KolamWave(Chunk_Index)`.
3.  **Mix:** `Encrypted_Chunk = Input_Chunk + Noise_Chunk`.
4.  **Transmit:** Send `Encrypted_Chunk` via WebSocket (Binary).

**Receiver (Decryption):**
1.  **Receive:** WebSocket Binary Data -> `Encrypted_Chunk`.
2.  **Generate Noise:** `Noise_Chunk = KolamWave(Chunk_Index)` (Must match Sender's logic exactly).
3.  **Subtract:** `Decrypted_Chunk = Encrypted_Chunk - Noise_Chunk`.
4.  **Play:** Output to Speakers.

### C. Backend (Relay)
The backend WebSocket handler in `fhss_chat.py` needs to be updated to support **Binary Frames**. Currently, it expects JSON text. It must detect binary messages and relay them to the other peer in the room without attempting to parse them.

## 3. Step-by-Step Implementation

### Step 1: Backend Support for Binary Relay
*   **File:** `backend/fhss_chat.py`
*   **Action:** Update `websocket_endpoint` to handle `websocket.receive_bytes()` or check message type.

### Step 2: Kolam Audio Utility (Frontend)
*   **File:** `src/utils/kolamAudio.ts`
*   **Action:** Create a class `KolamNoiseGenerator` that takes a Kolam Key (array of numbers) and generates audio buffers.

### Step 3: Voice Call Hook (Frontend)
*   **File:** `src/hooks/useVoiceCall.ts`
*   **Action:** Manage `AudioContext`, Microphone access, and WebSocket binary streaming.

### Step 4: UI Integration
*   **File:** `src/components/ChatInterface.tsx`
*   **Action:** Add a "Start Call" / "End Call" button. Visual indicator of "Encrypted Voice Active".

## 4. Security Note
This is a form of **Symmetric Stream Cipher** (specifically, an additive stream cipher or One-Time Pad approximation). Its security depends entirely on the secrecy of the Kolam Seed and the non-repetition of the keystream (which we approximate with the large Kolam matrix).
