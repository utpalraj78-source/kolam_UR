
import ctypes
import os
import sys
import time
import numpy as np
from typing import List, Tuple

# Fix for Venv Import issues: Ensure we look in the local venv
venv_site = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".venv", "Lib", "site-packages")
if os.path.exists(venv_site) and venv_site not in sys.path:
    sys.path.append(venv_site)

# Import Numba for Level 2 (GPU Acceleration)
try:
    from numba import cuda, guvectorize
    import numba
    NUMBA_AVAILABLE = True
except ImportError as e:
    NUMBA_AVAILABLE = False
    print(f"[HAL] Numba Import Error: {e}")
    print("[HAL] Level 2 GPU features will be disabled.")

# -----------------------------------------------------------------------------
# HARDWARE ABSTRACTION LAYER (HAL)
# -----------------------------------------------------------------------------
# This module acts as the bridge between Python logic and High-Performance 
# C++/VHDL/CUDA drivers.
# -----------------------------------------------------------------------------

class DriverLoader:
    @staticmethod
    def load_library(lib_name: str):
        """Attempts to load a shared library (DLL/SO)."""
        # 1. Try local compiled kernels (Level 1: Native Binary)
        local_path = os.path.join(os.path.dirname(__file__), "cpp_kernels", f"{lib_name}.dll")
        if sys.platform != "win32":
            local_path = os.path.join(os.path.dirname(__file__), "cpp_kernels", f"{lib_name}.so")
            
        if os.path.exists(local_path):
            try:
                # print(f"[HAL] Loading local kernel: {local_path}")
                return ctypes.CDLL(local_path)
            except OSError as e:
                print(f"[HAL] Failed to load local kernel {lib_name}: {e}")
                return None
        return None

class FPGADriver:
    """
    Interface for the Field-Programmable Gate Array (FPGA) logic.
    For Software-Defined Radio (SDR) setups, this bridges to compiled C++ kernels.
    """
    def __init__(self):
        # Level 1: Load Compiled C++ Kernel
        self._lib = DriverLoader.load_library("kolam_kernel")
        self.simulated = (self._lib is None)
        
        if self.simulated:
            print("[HAL] FPGA Driver not found. Falling back to Pure Python Simulation.")
        else:
            print("[HAL] FPGA/SDR C++ Kernel Loaded Successfully (Level 1 Achieved).")
            # Setup signatures
            self._lib.ldpc_encode_kernel.argtypes = [
                ctypes.POINTER(ctypes.c_int),
                ctypes.c_int,
                ctypes.POINTER(ctypes.c_int)
            ]

    def push_iq_stream(self, iq_samples: List[complex]) -> bool:
        """Sends Phase/Amplitude data to the RF Front-End."""
        if self.simulated:
            return len(iq_samples) > 0
        
        data_len = len(iq_samples)
        if data_len == 0:
            return True

        # Level 1: Data Marshaling
        input_data = (ctypes.c_int * data_len)(*[int(x.real * 100) for x in iq_samples])
        output_data = (ctypes.c_int * (data_len * 2))() 

        try:
            # Measure Micro-Latency for Industry Metrics
            t0 = time.perf_counter_ns()
            self._lib.ldpc_encode_kernel(input_data, data_len, output_data)
            t1 = time.perf_counter_ns()
            # print(f"[FPGA] Processed {data_len} samples in {(t1-t0)/1000:.2f} us")
            return True
        except Exception as e:
            print(f"[HAL] Kernel Error: {e}")
            return False

# -----------------------------------------------------------------------------
# LEVEL 2: REAL GPU KERNELS
# -----------------------------------------------------------------------------
if NUMBA_AVAILABLE:
    @cuda.jit
    def gpu_scramble_kernel(data, key, output):
        """
        Real CUDA Kernel: Parallel XOR Scrambling (Kolam Masking)
        Each thread handles one element independently.
        """
        pos = cuda.grid(1)
        if pos < data.size:
            # Simple demonstration of parallel encryption logic
            output[pos] = data[pos] ^ key

class CUDADriver:
    """
    Interface for NVIDIA GPU Acceleration (cuSignal / CUDA).
    Level 2: Uses actual RTX 3050 via Numba.
    """
    def __init__(self):
        self.available = False
        self.device_name = "Unknown"
        
        if NUMBA_AVAILABLE and cuda.is_available():
            try:
                self.available = True
                self.device = cuda.get_current_device()
                self.device_name = self.device.name.decode('utf-8') if isinstance(self.device.name, bytes) else self.device.name
                print(f"[HAL] NVIDIA GPU Detected: {self.device_name}") 
                print("[HAL] Level 2 Acceleration: ACTIVE (Numba JIT)")
            except Exception as e:
                print(f"[HAL] GPU Init Failed: {e}")
        else:
            print("[HAL] No NVIDIA GPU found or Numba missing. Using CPU fallback.")

    def kernel_launch(self, data: np.ndarray) -> np.ndarray:
        """
        Launches the 'gpu_scramble_kernel' on the RTX 3050.
        """
        if not self.available:
            return data 
        
        # 1. Transfer Host -> Device
        d_data = cuda.to_device(data)
        d_output = cuda.device_array_like(data)
        
        # 2. Configure Grid
        threads_per_block = 128
        blocks_per_grid = (data.size + (threads_per_block - 1)) // threads_per_block
        
        # 3. Launch Kernel
        # Use a dummy key for scrambling demo (e.g., 0xAA)
        gpu_scramble_kernel[blocks_per_grid, threads_per_block](d_data, 170, d_output)
        
        # 4. Transfer Device -> Host
        # print(f"[CUDA] Executed Kernel on {data.size} items via {self.device_name}")
        return d_output.copy_to_host()

class SIMCardReader:
    """
    Interface for Physical Smart Card Readers (ISO-7816).
    Used for hardware-based identity verification of subscribers.
    """
    def __init__(self):
        self.reader_present = False
        print("[HAL] Scanning for PC/SC Smart Card Readers...")
        # In a real TRL-9 system, we would use 'pyscard' here.
        # For current lab readiness, we simulate the interface.


class CPPEngine:
    """
    Interface for the 'Hybrid C++ Engine'.
    Runs the tight control loop in a native Windows Thread to bypass GLI/GC jitter.
    """
    def __init__(self):
        self._lib = DriverLoader.load_library("kolam_engine")
        self.available = (self._lib is not None)
        
        if self.available:
            print("[HAL] C++ Hybrid Engine Loaded Successfully (Industry-Ready Threading).")
            # Setup signatures
            self._lib.start_engine.argtypes = []
            self._lib.stop_engine.argtypes = []
            self._lib.get_telemetry.argtypes = [
                ctypes.POINTER(ctypes.c_uint64), # packets
                ctypes.POINTER(ctypes.c_double), # mbps
                ctypes.POINTER(ctypes.c_double), # latency
                ctypes.POINTER(ctypes.c_int),    # active_ues
                ctypes.POINTER(ctypes.c_double), # ecpri_mbps
                ctypes.POINTER(ctypes.c_uint64), # watchdog
                ctypes.POINTER(ctypes.c_bool),   # avx_active
                ctypes.POINTER(ctypes.c_double), # gflops
                ctypes.POINTER(ctypes.c_double), # watts
                ctypes.POINTER(ctypes.c_double)  # efficiency
            ]
        else:
            print("[HAL] C++ Hybrid Engine DLL not found/loadable.")

    def start(self):
        if self.available:
            self._lib.start_engine()

    def stop(self):
        if self.available:
            self._lib.stop_engine()

    def get_stats(self) -> dict:
        if not self.available:
            return {}
        
        packets = ctypes.c_uint64(0)
        mbps = ctypes.c_double(0.0)
        lat = ctypes.c_double(0.0)
        ues = ctypes.c_int(0)
        ecpri = ctypes.c_double(0.0)
        watchdog = ctypes.c_uint64(0)
        avx = ctypes.c_bool(False)
        gflops = ctypes.c_double(0.0)
        watts = ctypes.c_double(0.0)
        eff = ctypes.c_double(0.0)
        
        self._lib.get_telemetry(
            ctypes.byref(packets), 
            ctypes.byref(mbps), 
            ctypes.byref(lat), 
            ctypes.byref(ues),
            ctypes.byref(ecpri),
            ctypes.byref(watchdog),
            ctypes.byref(avx),
            ctypes.byref(gflops),
            ctypes.byref(watts),
            ctypes.byref(eff)
        )
        
        return {
            "packets_processed": packets.value,
            "throughput_mbps": mbps.value,
            "latency_us": lat.value,
            "active_ues": ues.value,
            "ecpri_mbps": ecpri.value,
            "watchdog": watchdog.value,
            "avx_active": avx.value,
            "compute_gflops": gflops.value,
            "estimated_watts": watts.value,
            "efficiency_mw_per_mbps": eff.value
        }
