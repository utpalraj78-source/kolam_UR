# Simulation Scenarios & Drill Logic

This document details the logic behind the "Drills" and simulation scenarios triggered via the Admin Dashboard, demonstrating how Kolam handles adversarial conditions.

## 1. The Normal Operation Scenario
**Logic:**
*   **Traffic Model**: User traffic is modeled as a Gaussian Distribution (`np.random.normal`).
*   **Mean**: 1000 UEs / 1200 Mbps.
*   **Deviation**: +/- 50 UEs.
*   **Purpose**: Demonstrates steady-state 5G Core behavior where Packet Scheduling is predictable.

## 2. Attack Drill: "NEURAL SPOOF" (AI Adversary)
**Context:** `handleTriggerAttack('NEURAL_SPOOF')`

### The Threat
An attacker uses a Generative Adversarial Network (GAN) to mimic the RF signature of valid UEs, attempting to bypass authentication without valid SIM keys (SUCI).

### Kolam's Defense: "Neural Guard"
*   **Detection Logic**: The system analyzes the "RF Fingerprint" (IQ Constellation variance).
*   **Response**: The system transitions the `neural_guard` shield from `ACTIVE` to `ATTACK_DETECTED`.
*   **Dashboard Effect**: The shield status turns RED/Purple, indicating that the AI model successfully classified the incoming signal as synthetic/spoofed.

## 3. Attack Drill: "VRAM FLOOD" (Denial of Service)
**Context:** `handleTriggerAttack('VRAM_FLOOD')`

### The Threat
An attacker floods the Data Plane with massive amounts of malformed eCPRI packets that require deep inspection, intending to exhaust the GPU VRAM or PCIe Bandwidth.

### Kolam's Defense: "DMA Quota"
*   **Logic**: The `DigitalTwinManager` monitors the `dma_quota` metric.
*   **Response**:
    *   **Normal**: 256MB / 4GB usage.
    *   **Attack**: The system simulates a spike in buffer allocation.
    *   **Mitigation**: The Dashboard reports "THROTTLED". This demonstrates **Quality of Service (QoS) Policing**, where the system drops excess packets rather than crashing the kernel.
*   **Theoretical Basis**: This mimics "Backpressure" in packet processing pipelines (e.g., Token Bucket algorithms).

## 4. The "Race Condition" Benchmark
**Context:** Legacy Python vs. Kolam C++ Kernel

### The Scenario
A direct "Head-to-Head" race to process 128,000 IQ samples (1 TTI of data).

### The Math
*   **Python**: Interpreted execution.
    *   Overhead: Bytecode decoding, Type checking per integer (`PyObject`).
    *   Result: ~30ms latency.
*   **Kolam C++**: Native execution.
    *   Overhead: Almost zero (pre-compiled machine code).
    *   Optimization: Data sits in L1/L2 Cache.
    *   Result: ~0.15ms latency.

### The Teaching Moment
This visualizes **Amdahl's Law** in practice: Optimization of the parallel portion (Data Plane) yields massive speedups (200x), proving why Python is unsuitable for the 6G Data Plane despite its utility in the Control Plane.
