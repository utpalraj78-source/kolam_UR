
# 🏗️ Industry Readiness & Hardware Deployment Roadmap

This document outlines the technical and hardware-level gaps between the **Kolam-Quantum-6G Simulator** and a commercial-grade **Base Station (gNB)** deployment for the 2026-2030 era.

---

## 🛑 The "Research-to-Reality" Gap Analysis

While the current simulator leads in **theoretical logic (6G ISAC, Neural RX, PQC)**, it lacks the **deterministic reliability** and **standardized interfaces** required for carrier-grade deployment.

| Feature Gap | Simulator State | Industrial Requirement | Criticality |
| :--- | :--- | :--- | :--- |
| **Logic Platform** | Python / NumPy | FPGA (VHDL) / GPU (CUDA) | 🔴 High |
| **Architecture** | Monolithic (All-in-one) | Disaggregated O-RAN (RU/DU/CU) | 🔴 High |
| **Timing** | Soft Real-time (Millisecond) | Hard Real-time (Nanosecond) | 🔴 High |
| **Subscriber Auth** | Password-based | SIM/AKA 5G Security Anchor | 🟡 Med |
| **RF Realism** | Ideal Mathematical Channels | Physical RF Impairment Compensation | 🟡 Med |

---

## 🛠️ Phase 1: Hardware Requirements (The Physical Stack)

To move from a simulation to a real radio transmission, the following hardware infrastructure is required:

### 1. The Radio Unit (RU) - Hardware
*   **Antenna Arrays**: Integrated Sub-THz (90GHz - 300GHz) phased arrays with 128+ elements for Massive MIMO.
*   **Transceivers**: High-speed DACs/ADCs (Deep-sampled at 10-20 GS/s) to handle wideband Kolam-FHSS bandwidths correctly.
*   **Front-End Modules (FEM)**: Gallium Nitride (GaN) power amplifiers to handle THz frequencies without excessive heat.

### 2. The Compute Stack (DU/CU)
*   **Acceleration Card**: NVIDIA Aerial or Xilinx T1 Telco Accelerator.
    *   *Purpose*: Offload LDPC, Polar Coding, and Kolam-Subcarrier mapping from the CPU.
*   **AI Inference Engine**: Dedicated NPUs (Neural Processing Units) or H100/L4 GPUs to run the **Neural Receiver** in real-time.
*   **Timing Sync**: GPS/GNSS disciplined oscillator with **IEEE 1588v2 PTP (Precision Time Protocol)** support for nanosecond-level clock synchronization across towers.

---

## 🌐 Phase 2: Architectural Shifts (O-RAN Compliance)

Industry leaders (Ericsson, Nokia, Samsung) do not build monolithic blocks. They build **Open-RAN** components.

### 1. Functional Split 7.2x
The project must be split into:
*   **Low-PHY**: Running on the FPGA (Radio Unit).
*   **High-PHY & MAC**: Running on the Distributed Unit (DU).
*   **RRC/PDCP**: Running on the Central Unit (CU) or the Cloud.

### 2. Standardized Interfaces
Current logic uses raw Python calls; Industry requires:
*   **E2 Interface**: Connecting the Near-RT RIC (RAN Intelligent Controller) to the DU.
*   **A1 Interface**: For AI model management (Neural RX updates).
*   **F1 Interface**: For CU/DU communication.

---

## 🔐 Phase 3: Subscriber & Security Hardening

To support millions of phones, the following must be implemented:

1.  **5G/6G AKA (Authentication & Key Agreement)**:
    *   Replacing simple logins with **USIM card verification**.
    *   Implementing the **SUCI (Subscription Concealed Identifier)** for privacy.
2.  **Carrier-Grade HARQ**:
    *   Instead of our simulated retransmission, a **Circular Buffer Memory** system capable of handling 100+ parallel HARQ processes per millisecond.
3.  **HSS/UDM Integration**:
    *   Connecting to a global database for subscriber roaming and billing.

---

## 📈 Summary: Road to v4.0 "Carrier Grade"

1.  **Rewrite in C++ / SystemVerilog**: Migrate core Kolam-FHSS sequences for hardware execution.
2.  **SDR Integration**: Test on **NI USRP-X410** or **Ettus Research N321** hardware.
3.  **3GPP Compliance**: Align the RRC Manager with **3GPP TS 38.331** exactly.
4.  **Field Testing**: Moving from mathematical models to measured **Power Delay Profiles (PDP)** from real city environments.

**Status**: Currently at **TRL 4 (Technology Readiness Level: Component Validation in Lab Environment)**.
**Target**: **TRL 7 (System Prototype Demonstration in Operational Environment)**.
