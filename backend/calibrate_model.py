import sys
import os
import numpy as np
import math

# Add root directory to path so we can import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.main import simulate_effective_snr_ber, key_to_hops
from backend.kolam_generator import generate_kolam
from backend.algo import generate_keys_from_binary
from backend.utils import compute_binary_from_M
import backend.main as main_module

# Configuration for "Training"
TRAIN_SIZES = [5, 7, 9, 11, 13]  # Train across multiple grid sizes
TRAIN_SNR = [0, 5, 10]
TARGET_BER = {
    # Theoretical/Desired BER targets for FHSS (approximate)
    0: 0.08,   # High noise
    5: 0.04,   # Medium noise
    10: 0.005  # Low noise
}

def train_simulation_model():
    print("--- Starting Simulation Model Calibration ---")
    print(f"Targeting BERs: {TARGET_BER}")
    
    # Initial Guesses
    current_user_power = 0.8
    current_jammer_power = 3.0
    
    best_error = float('inf')
    best_params = (current_user_power, current_jammer_power)
    
    # Grid Search Range (Training Loop)
    user_power_range = np.arange(0.5, 1.5, 0.1)
    jammer_power_range = np.arange(2.0, 5.0, 0.5)
    
    for u_pow in user_power_range:
        for j_pow in jammer_power_range:
            total_error = 0.0
            
            # Temporarily patch the global constants in main (conceptually - here we pass them if function allowed, 
            # but main.py functions use globals. We might need to modify main.py to accept them or monkeypatch)
            # Since we imported them, we can't easily change the globals inside 'main' module without monkeypatching.
            
            # Patch global constants in main module
            main_module.USER_INT_POWER = u_pow
            main_module.JAMMER_INT_POWER = j_pow
            
            for k in TRAIN_SIZES:
                # Generate a sample Kolam for this size
                try:
                    # Generate keys
                    M, _, _, _, _, _ = generate_kolam("4-fold", 4, k, seed=42, analyze=True, return_preview=False)
                    B = compute_binary_from_M(M)
                    pure, rnd, hybrid = generate_keys_from_binary(B, mod=16, bits_per_cell=4)
                    
                    # Convert to hops
                    pure_hops = key_to_hops(pure.flatten(), 64, 4)
                    rnd_hops = key_to_hops(rnd.flatten(), 64, 4)
                    hybrid_hops = key_to_hops(hybrid.flatten(), 64, 4)
                    
                    sequences = {
                        "pure": pure_hops,
                        "random": rnd_hops,
                        "hybrid": hybrid_hops
                    }
                    
                    # Run Simulation
                    for snr in TRAIN_SNR:
                        results = simulate_effective_snr_ber(
                            snr_db=snr,
                            channels=64,
                            jammer_fraction=0.2,
                            num_users=10,
                            hops_sequences=sequences,
                            num_trials=5, # Keep low for speed
                            bits_per_trial=1000
                        )
                        
                        # Calculate Error (MSE against Target)
                        # We average the error across all 3 key types for robustness
                        avg_ber = (results["pure"] + results["random"] + results["hybrid"]) / 3.0
                        target = TARGET_BER.get(snr, 0.01)
                        error = (avg_ber - target) ** 2
                        total_error += error
                        
                except Exception as e:
                    print(f"Error training on k={k}: {e}")
                    continue
            
            # Check if this is the best model
            if total_error < best_error:
                best_error = total_error
                best_params = (u_pow, j_pow)
                print(f"New Best: UserPow={u_pow:.2f}, JammerPow={j_pow:.2f} | Error={total_error:.6f}")

    print("\n--- Training Complete ---")
    print(f"Optimal Parameters -> User Power: {best_params[0]:.2f}, Jammer Power: {best_params[1]:.2f}")
    print("Update 'backend/main.py' with these values for better accuracy across all sizes.")
    
    with open("backend/data/calibration_result.txt", "w") as f:
        f.write(f"User Power: {best_params[0]:.2f}\n")
        f.write(f"Jammer Power: {best_params[1]:.2f}\n")

if __name__ == "__main__":
    train_simulation_model()
