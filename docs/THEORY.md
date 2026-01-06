# Algorithmic & Theoretical Foundations

This document explains the mathematical theories, physics principles, and telecom standards that underpin the various components of the Kolam 6G Lab.

## 1. Digital Twin Simulation Theory
**Context:** `backend/digital_twin_manager.py`, `backend/cpp_kernels/kolam_engine.cpp`

### Deterministic Real-Time Systems (RTS)
The transition from Python TRL-4 to C++ TRL-5 relies on **Rate Monotonic Scheduling (RMS)** principles.
*   **The Problem:** General Purpose Operating Systems (GPOS) like Windows schedule threads fairly, leading to jitter.
*   **The Theory:** A "Hard Real-Time" system must meet deadlines.
*   **Implementation:** We employ a **Spinlock (Busy Wait)** strategy.
    *   $T_{exec}$: Time taken to encode data.
    *   $T_{period}$: The required TTI (500µs).
    *   We sleep for exactly $T_{wait} = T_{period} - T_{exec}$.
    *   By actively polling the CPU clock (`while(now < target)`), we avoid the OS context-switch overhead of ~1-10ms.

### eCPRI Bandwidth Calculation (Information Theory)
**Context:** `kolam_engine.cpp` (O-RAN Framing)

We interpret the fronthaul requirement using Shannon's capacity implications for raw I/Q transport.
The formula used for the eCPRI bandwidth calculation is derived from 3GPP TS 38.211 (Physical Channels):

$$ R_{ecpri} = N_{prb} \times N_{sc} \times N_{sym} \times B_{iq} \times N_{ant} \times \frac{1}{T_{slot}} $$

Where:
*   $N_{prb} = 273$ (Physical Resource Blocks for 100MHz BW)
*   $N_{sc} = 12$ (Subcarriers per PRB)
*   $N_{sym} = 14$ (OFDM Symbols per Slot)
*   $B_{iq} = 32$ (Bit depth: 16-bit I + 16-bit Q)
*   $N_{ant} = 4$ (4x4 MIMO antennas)
*   $T_{slot} = 500 \mu s$ (Slot duration for SCS 30kHz)

This yields approximately:
$$ \approx 273 \times 12 \times 14 \times 32 \times 4 / 0.0005 \approx 3.6 \text{ Gbps} $$
Our code calculates this dynamically to prove "Wire Format Compliance."

## 2. DSP & Vectorization Theory
**Context:** `dsp_processing_avx2` in `kolam_engine.cpp`

### SIMD (Single Instruction, Multiple Data)
Modern CPUs are limited by the Fetch-Decode-Execute cycle. Scalar math processes one element at a time:
$$ C_i = A_i \times B_i + D_i $$
This requires 1 instruction per index $i$.

**AVX2 Theory:**
Using 256-bit registers (`ymm`), we pack 8 separate `float32` (32-bit) values into a single register.
$$ \vec{C} = \vec{A} \times \vec{B} + \vec{D} $$
The `vfmadd231ps` instruction executes 8 multiplications and 8 additions in a single CPU cycle.
*   **Scalar Flops**: 2 ops/cycle.
*   **AVX2 Flops**: 16 ops/cycle (8 elements * 2 ops).
*   **Theoretical Speedup**: 8x.

## 3. O-RAN Architecture Theory
**Context:** `docs/ARCHITECTURE.md`

### Split 7.2x (Lower Layer Split)
The project simulates the 7.2x split defined by the O-RAN Alliance.
*   **Theory:** The tradeoff between Fronthaul Bandwidth and Radio Complexity.
*   **High-PHY (in DU)**: Encoding, Scrambling, Modulation.
*   **Low-PHY (in RU)**: FFT/iFFT, Beamforming.
*   **Why 7.2x?**: Moving the FFT to the Radio Unit (RU) significantly reduces the bandwidth compared to Split 8 (CPRI), which transmits time-domain samples. Our simulation generates Frequency Domain I/Q specifically to match this standard.

## 4. Hardware Abstraction Theory
**Context:** `backend/hardware_drivers.py`

### User Space Drivers vs. Kernel Drivers
Traditional drivers run in **Kernel Mode** (Ring 0). A crash causes a Blue Screen of Death (BSOD).
*   **Our Approach:** User Space Driver via `ctypes` / Shared Library.
*   **Theory:** Application Binary Interface (ABI) Stability. By keeping the engine in a DLL/SO, the Python Application (Control Plane) is insulated from memory corruption in the Data Plane.
*   **Shared Memory IPC:** We use atomic loads (`std::atomic`) to ensure cache coherency between the "Producer" thread (C++) and "Consumer" thread (Python Dashboard) without locking mutexes, preventing "Priority Inversion" where high-priority radio threads wait for low-priority UI threads.
