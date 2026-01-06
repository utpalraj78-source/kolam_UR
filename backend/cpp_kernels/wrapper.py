
import ctypes
import os
import sys

# Attempt to load the C++ kernel library
LIB_PATH = os.path.join(os.path.dirname(__file__), "kolam_kernel.so")

_lib = None
try:
    if os.path.exists(LIB_PATH):
        _lib = ctypes.CDLL(LIB_PATH)
        print(f"[C++] Loaded DSP Kernel: {LIB_PATH}")
    else:
        # On Windows dev, we might not have the .so compiled yet.
        print("[C++] Kernel library not found. Using Python fallback.")
except Exception as e:
    print(f"[C++] Error loading kernel: {e}")

def cpp_ldpc_encode(input_bits):
    """Bridge to C++ LDPC Encoder"""
    if not _lib:
        return input_bits + [b for b in input_bits] # Python fallback (just duplicate)
    
    length = len(input_bits)
    InputArray = ctypes.c_int * length
    OutputArray = ctypes.c_int * (length * 2)
    
    input_c = InputArray(*input_bits)
    output_c = OutputArray()
    
    _lib.ldpc_encode_kernel(input_c, length, output_c)
    return list(output_c)

def cpp_subcarrier_map(subcarriers, seed):
    """Bridge to C++ Mapper"""
    if not _lib:
        return [s + (seed % 16) for s in subcarriers]
        
    count = len(subcarriers)
    Arr = ctypes.c_int * count
    
    input_c = Arr(*subcarriers)
    output_c = Arr()
    
    _lib.subcarrier_map_kernel(input_c, count, seed, output_c)
    return list(output_c)
