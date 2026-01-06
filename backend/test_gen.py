import numpy as np
from kolam_generator import generate_kolam
import traceback

print("Starting test...")
try:
    M, _, _, _, _, _ = generate_kolam("random", 4, 15, seed=1000, analyze=False, return_preview=False)
    print(f"Success! Shape: {M.shape}")
except Exception:
    traceback.print_exc()
