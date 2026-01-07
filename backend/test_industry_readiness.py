
import sys
import os
import numpy as np

# Ensure parent directory is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hardware_drivers import FPGADriver, CUDADriver, SIMCardReader

def test_drivers():
    print("Testing Hardware Abstraction Layer (HAL)...")
    
    # 1. FPGA
    print("\n[1] Testing FPGA Driver:")
    fpga = FPGADriver()
    if fpga.simulated:
        print("-> Running in Software Simulation Mode (Expected on dev PC)")
    else:
        print("-> !!! REAL HARDWARE DETECTED !!!")

    # 2. CUDA
    print("\n[2] Testing CUDA Driver:")
    cuda = CUDADriver()
    if cuda.available:
        print("-> NVIDIA GPU Detected!")
        res = cuda.kernel_launch(np.array([1, 2, 3]))
        print(f"-> Kernel Result: {res}")
    else:
        print("-> No NVIDIA GPU found (or drivers missing). Fallback to CPU.")

    # 3. SIM Card
    print("\n[3] Testing Smart Card Reader:")
    sim = SIMCardReader()
    if sim.reader_present:
        print("-> PC/SC Smart Card Service Connected")
    else:
        print("-> Smart Card Service Not Found")

    print("\nHAL Test Complete.")

if __name__ == "__main__":
    test_drivers()
