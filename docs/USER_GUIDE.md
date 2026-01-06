# User Guide & Dashboard Manual

## Getting Started

### Prerequisites
*   Windows 10/11
*   Python 3.10+
*   Node.js 18+
*   MinGW / G++ Compiler (for rebuilding kernels)

### Installation
The project is pre-configured. Ensure the backend virtual environment is active.
```powershell
# 1. Start Backend
python backend/run_backend.py
```

```powershell
# 2. Start Frontend (in a new terminal)
npm run dev
```

## Using the Dashboard
Navigate to: `http://localhost:8080/features/Telecom/frontend/admin/index.tsx` (or simply the root if configured).

### 1. The Digital Twin Control Panel
The large card at the top left is your main control surface.
*   **START EMULATION**: Kicks off the `DigitalTwinManager` and the underlying C++ Engine.
*   **Active Subscribers**: Shows the number of simulated UEs (User Equipment/Phones).
*   **Live Benchmark (Race Condition)**:
    *   **Gray Bar (Legacy)**: Latency of a Python loop (typically ~30ms).
    *   **Green Bar (Kolam)**: Latency of the C++ AVX2 loop (typically ~150µs).
    *   **Speedup Ratio**: The "X Factor" improvement (e.g., 200x).

### 2. Hardware Acceleration & Infrastructure
This card displays the TRL-6 and TRL-7 metrics.
*   **eCPRI FRONTHAUL**: The amount of data traffic that *would* be on the fiber optic cable if this were a physical radio. For 100MHz 4x4 MIMO, expect ~3.0 Gbps.
*   **WATCHDOG**: A counter that increments. If this stops, the C++ thread has crashed.
*   **DMA QUOTA**: Simulated PCIe memory usage.
*   **COMPUTE DENSITY (AVX2)**:
    *   **GFLOPS**: Billions of operations per second.
    *   **SIMD VECTORIZED**: Confirmation that the CPU is using advanced instructions.

### 3. Diagnostic "Drills"
You can trigger simulated attacks to see how the system responds.
*   **NEURAL SPOOF**: Updates the "Neural Guard" shield status.
*   **VRAM FLOOD**: Updates the "DMA Quota" status to "THROTTLED".

## Troubleshooting
**Q: The Dashboard says "CPU FALLBACK" instead of "ACTIVE".**
A: This usually means the `kolam_engine.dll` failed to load. Check the backend console output for errors like `[HAL] C++ Hybrid Engine DLL not found`.

**Q: The Latency is high (>1000us).**
A: Ensure your PC is plugged into power (not battery mode) so the CPU can boost. The AVX2 kernel relies on high clock speeds.
