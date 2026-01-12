# 🧪 HackRF Experiments for Kolam-FHSS
Now that your HackRF is active, here are the specific experiments you can run to validate the **6G-Kolam Technology**.

Since you have **one device**, these tests focus on **Transmission Security** and **signal characteristics**.

---

## Experiment 1: The "Digital Fingerprint" Test
**Goal**: Prove that Kolam creates unique "physical signatures" for every packet, even if the data is identical. This prevents **Replay Attacks**.

### Steps:
1.  Run the **Encryption Test** script twice with the *same* message ("HELLO").
2.  The system uses the **Kolam Seed** (Time/Space based).
3.  **Observation**:
    *   In a standard radio (e.g., Walkie Talkie), the waveform is identical both times.
    *   In Kolam, the `hackrf_bridge` generates completely different IQ data patterns (high entropy).
    *   **Verification**: Compare the file sizes or checksums of the generated `.c8` files. They will be mathematically distinct.

---

## Experiment 2: The "Frequency Hop" Visualizer
**Goal**: Visualize the **Frequency Hopping Spread Spectrum (FHSS)** logic (the core of this project).

### The Concept:
Instead of staying on 2.45 GHz (Channel 9), the HackRF will jump between **2.41 GHz (Ch 1)**, **2.43 GHz (Ch 6)**, and **2.46 GHz (Ch 11)** every 100 milliseconds.

### How to Test:
1.  We can create a script (`test_hackrf_hopping.py`) that retunes the radio in a loop.
2.  **Verification**:
    *   Download a free **"Wi-Fi Analyzer"** app on your phone.
    *   Watch the "Spectrum View".
    *   You will see "Ghost Signals" appearing and disappearing on different Wi-Fi channels rapidly.
    *   *This proves your Digital Twin is successfully controlling the physical radio frequencies.*

---

## Experiment 3: The "Stealth Noise" Check
**Goal**: Prove that the encrypted signal looks like "Background Noise" to unauthorized receivers.

### Steps:
1.  Transmit the **Continuous Beacon** (`test_hackrf_continuous.py`).
2.  If you have a second SDR (or a friend with one), tune to 2.45 GHz.
3.  **Observation**:
    *   A normal radio signal has a sharp "spike" (Carrier).
    *   The Kolam signal (QAM-16 Scrambled) looks like a **flat, wide bump**.
    *   An attacker looking for a "spike" will miss it entirely. This is **Low Probability of Detection (LPD)**.

---

## Experiment 4: The "Cyber-Physical" Digital Twin
**Goal**: Control the hardware remotely via the Web Dashboard.

### Steps:
1.  Open the **Frontend** (`http://localhost:8080`).
2.  Navigate to the **Live Simulation** or **Neural Studio** page.
3.  Trigger a large simulation (e.g., "Run Scenario").
4.  **Observation**:
    *   Watch your physical HackRF.
    *   Every time the Digital Twin processes a frame, the **TX LED** on your desk blinks.
    *   This demonstrates **Real-Time O-RAN Control**, where software logic drives physical infrastructure.

---

## Next Steps
*   **Safety**: Remember to attach an antenna!
*   **Recommendation**: Run **Experiment 2 (Hopping)** next. It is the most visually impressive if you have a phone with a spectrum app.
