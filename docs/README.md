# Kolam 6G Lab - Project Documentation

**Version:** 3.0 (TRL-7 Industrial Prototype)  
**Date:** January 2026

## Overview
The **Kolam 6G Lab** is an advanced telecommunications simulation platform designed to demonstrate next-generation 6G Radio Access Network (RAN) concepts. It evolves beyond simple simulations by integrating industry-standard architectures, including **O-RAN Split 7.2x**, **eCPRI Fronthaul framing**, and **High-Performance Computing (HPC)** kernels using **AVX2 Intrinsics** and **CUDA Acceleration**.

This project serves as a "Digital Twin" of a Carrier-Grade 5G/6G Distributed Unit (DU), capable of generating realistic telemetry, traffic patterns, and hardware interactions.

## Documentation Index

- **[Architecture Overview](ARCHITECTURE.md)**  
  Deep dive into the Hybrid Python + C++ Design, Zero-Copy Shared Memory, and the O-RAN Protocol Stack.

- **[Technology Readiness Roadmap (TRL)](TRL_ROADMAP.md)**  
  The engineering journey from a Lab Prototype (TRL 4) to an Industrially Validated Software System (TRL 7). Explains the critical upgrades made to solve Python GIL jitter, wire-format compliance, and compute density.

- **[Hardware Drivers & Kernel API](HARDWARE_DRIVERS.md)**  
  Technical reference for the `hardware_drivers.py` HAL (Hardware Abstraction Layer) and the low-level `kolam_engine.cpp` shared library.

- **[User Guide & Dashboard Manual](USER_GUIDE.md)**  
  How to start the simulation, interpret the Admin Dashboard metrics (GFLOPS, eCPRI Mbps, Latency), and run benchmarks.

- **[Algorithmic Theory](THEORY.md)**  
  Mathematical foundations: Rate Monotonic Scheduling, Shannon's Capacity for eCPRI, and SIMD Vectorization math.

- **[Simulation Scenarios](SCENARIOS.md)**  
  Explanation of the "Drill" logic (Neural Spoof, VRAM Flood) and the theory behind the "Race Condition" benchmark.

## Quick Start
1.  **Start Backend**: `python backend/run_backend.py`
2.  **Start Frontend**: `npm run dev`
3.  **Access Dashboard**: `http://localhost:8080`
4.  **Action**: Click "START EMULATION" on the Digital Twin card.

## Key Technologies
- **Control Plane**: Python (FastAPI/AsyncIO)
- **Data Plane**: C++11 (Native Threads, AVX2 Intrinsics)
- **Fronthaul**: simulated eCPRI (Split 7.2x) on simulated Optical Link
- **Optimization**: SIMD (Single Instruction Multiple Data), Shared Memory Atomic Locks
