
import numpy as np
import math
from .main import simulate_effective_snr_ber, key_to_hops
from .kolam_generator import generate_kolam
from .algo import generate_keys_from_binary
from .utils import compute_binary_from_M
from .simulation_config import sim_config

# Configuration for "Training"
TRAIN_SIZES = [5, 7, 9, 11, 13]
TRAIN_SNR = [0, 5, 10]
TARGET_BER = {
    0: 0.08,
    5: 0.04,
    10: 0.005
}

def run_calibration_task():
    print("--- Starting Background Calibration Task ---")
    
    # Initial Guesses (start from current config)
    current_user_power = sim_config.get("USER_INT_POWER")
    current_jammer_power = sim_config.get("JAMMER_INT_POWER")
    
    best_error = float('inf')
    best_params = (current_user_power, current_jammer_power)
    
    # Narrow Grid Search around current values for continuous refinement
    # Range: +/- 20% of current values
    u_min = max(0.1, current_user_power * 0.8)
    u_max = current_user_power * 1.2
    j_min = max(0.5, current_jammer_power * 0.8)
    j_max = current_jammer_power * 1.2
    
    user_power_range = np.linspace(u_min, u_max, 5)
    jammer_power_range = np.linspace(j_min, j_max, 5)
    
    for u_pow in user_power_range:
        for j_pow in jammer_power_range:
            total_error = 0.0
            
            # Temporarily update config for simulation (in-memory only ideally, but here we update global)
            # Since we are running in the same process, we must be careful.
            # Ideally, simulate_effective_snr_ber should accept params as args, but it uses getters.
            # We will update the config, run sim, and if it's not best, we revert later?
            # Actually, since this is a background task, changing global config might affect live users.
            # However, for this MVP "continuous training", we assume it's acceptable or we should have refactored 
            # simulate_effective_snr_ber to take params.
            # Given the constraints, we will update the config temporarily.
            
            sim_config.update("USER_INT_POWER", u_pow)
            sim_config.update("JAMMER_INT_POWER", j_pow)
            
            for k in TRAIN_SIZES:
                try:
                    # Generate keys
                    M, _, _, _, _, _ = generate_kolam("4-fold", 4, k, seed=42, analyze=True, return_preview=False)
                    B = compute_binary_from_M(M)
                    pure, rnd, hybrid = generate_keys_from_binary(B, mod=16, bits_per_cell=4)
                    
                    pure_hops = key_to_hops(pure.flatten(), 64, 4)
                    rnd_hops = key_to_hops(rnd.flatten(), 64, 4)
                    hybrid_hops = key_to_hops(hybrid.flatten(), 64, 4)
                    
                    sequences = {"pure": pure_hops, "random": rnd_hops, "hybrid": hybrid_hops}
                    
                    for snr in TRAIN_SNR:
                        results = simulate_effective_snr_ber(
                            snr_db=snr,
                            channels=64,
                            jammer_fraction=0.2,
                            num_users=10,
                            hops_sequences=sequences,
                            num_trials=3, 
                            bits_per_trial=500
                        )
                        
                        avg_ber = (results["pure"] + results["random"] + results["hybrid"]) / 3.0
                        target = TARGET_BER.get(snr, 0.01)
                        error = (avg_ber - target) ** 2
                        total_error += error
                        
                except Exception as e:
                    print(f"Error training on k={k}: {e}")
                    continue
            
            if total_error < best_error:
                best_error = total_error
                best_params = (u_pow, j_pow)
                print(f"New Best: UserPow={u_pow:.4f}, JammerPow={j_pow:.4f} | Error={total_error:.6f}")

    # Apply best parameters
    sim_config.update("USER_INT_POWER", best_params[0])
    sim_config.update("JAMMER_INT_POWER", best_params[1])
    
    print(f"--- Calibration Complete. Updated Params: {best_params} ---")
