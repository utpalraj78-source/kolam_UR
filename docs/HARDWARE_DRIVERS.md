# Hardware Drivers & Kernel API

This document provides a reference for the Hardware Abstraction Layer (HAL) used in the project.

## 1. CPPEngine (The Hybrid Core)
**File**: `backend/hardware_drivers.py`  
**Library**: `backend/cpp_kernels/kolam_engine.dll`

The primary interface for the TRL-7 Industry Ready Engine.

### Methods

#### `__init__()`
Loads the compiled shared library using `ctypes`. Validates the existence of the DLL and sets up the function signatures for argument types (POINTERs).

#### `start()`
Launches the native OS thread (Data Plane).
*   **Safety**: Checks if the engine is already running to prevent thread duplication.
*   **Metrics**: Resets packet counters and watchdog timers.

#### `stop()`
Signals the C++ thread to terminate (`stats.running = false`) and waits for the thread to join (clean shutdown).

#### `get_stats() -> dict`
Performs a zero-copy read of the atomic memory structures.
*   **Returns**:
    *   `packets_processed`: Total blocks encoded.
    *   `throughput_mbps`: Real-time User Plane throughput.
    *   `latency_us`: Loop execution time (critical metric).
    *   `ecpri_mbps`: Calculated Fronthaul Bandwidth (TRL 6).
    *   `watchdog`: Lifecycle heartbeat counter (TRL 6).
    *   `avx_active`: Boolean flag for SIMD status (TRL 7).
    *   `compute_gflops`: Mathematical complexity throughput (TRL 7).

## 2. Low-Level C++ API
**File**: `backend/cpp_kernels/kolam_engine.cpp`

### `dsp_processing_avx2(int complexity)`
The core mathematical kernel.
*   **Input**: `complexity` (Number of loops).
*   **Logic**: Uses `_mm256_set1_ps` and `_mm256_fmadd_ps` to perform fused multiply-add operations on 256-bit vectors (8 floats).
*   **Purpose**: Simulates the LDPC / FFT load of a 5G base station.

### `engine_loop_func()`
The main thread loop.
*   **Scheduler**: Uses `std::chrono::high_resolution_clock` to measure frame time.
*   **Busy Wait**: Implements a `while(elapsed < 500us)` spinlock to ensure deterministic jitter-free execution.
