from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import numpy as np
import math
import os
import sys

# Adjust path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from backend.simulation_config import sim_config
from backend.fhss_utils import key_to_hops, true_collision_probability, calculate_security_score, true_consecutive_collision_probability as utils_true_consecutive

router = APIRouter()

# -------------------------------------------------------------------------
# SIMULATION LOGIC w/ Adaptive Frequency Hopping (Copied from main.py)
# -------------------------------------------------------------------------

def apply_adaptive_hopping(hops_seq: np.ndarray, channels: int, interference_seq: np.ndarray = None) -> np.ndarray:
    if hops_seq.size <= 1 or channels <= 1:
        return hops_seq
    
    result = hops_seq.copy()
    window = min(4, channels - 1)
    
    rng = np.random.RandomState(42)
    
    MAI_PROBABILITY = 0.15
    ASYNC_JITTER = 1

    for i in range(1, len(result)):
        current_hop = result[i]
        occupied = set()
        
        start_check = max(0, i - window)
        occupied.update(result[start_check:i])
        
        if interference_seq is not None:
            for offset in range(-ASYNC_JITTER, ASYNC_JITTER + 1):
                idx = i + offset
                if 0 <= idx < len(interference_seq):
                    occupied.add(interference_seq[idx])

        num_mai = int(channels * MAI_PROBABILITY)
        if num_mai > 0:
            mai_channels = rng.choice(channels, num_mai, replace=False)
            occupied.update(mai_channels)

        is_collision = (current_hop in occupied)
        
        if is_collision:
            candidates = [c for c in range(channels) if c not in occupied]
            if candidates:
                result[i] = rng.choice(candidates)
            else:
                critical_block = set()
                if interference_seq is not None and i < len(interference_seq):
                    critical_block.add(interference_seq[i])
                
                soft_candidates = [c for c in range(channels) if c not in critical_block]
                if soft_candidates:
                    result[i] = rng.choice(soft_candidates)
                else:
                    pass
                
    return result

def get_signal_power():
    return sim_config.get("SIGNAL_POWER")

def get_user_int_power():
    return sim_config.get("USER_INT_POWER")

def get_jammer_int_power():
    return sim_config.get("JAMMER_INT_POWER")

def simulate_effective_snr_ber(*, snr_db: float, channels: int, jammer_fraction: float, num_users: int, hops_sequences: Dict[str, np.ndarray], num_trials: int, bits_per_trial: int) -> Dict[str, float]:
    snr_lin = max(10 ** (snr_db / 10), 1e-12)
    noise_power = get_signal_power() / snr_lin
    num_jammed = max(1, int(channels * jammer_fraction))
    results = {k: 0.0 for k in hops_sequences.keys()}
    for _ in range(max(1, num_trials)):
        jammed_set = set(np.random.choice(channels, num_jammed, replace=False))
        other_users = np.random.randint(0, channels, size=(num_users, bits_per_trial))
        for variant, seq in hops_sequences.items():
            if seq.size == 0:
                continue
            seq_len = seq.size
            ber_sum = 0.0
            for i in range(bits_per_trial):
                hop = int(seq[i % seq_len])
                collisions = np.count_nonzero(other_users[:, i] == hop)
                interference = collisions * get_user_int_power()
                if hop in jammed_set:
                    interference += get_jammer_int_power()
                denom = noise_power + interference
                snr_eff = get_signal_power() / max(denom, 1e-12)
                ber_sum += 0.5 * math.erfc(math.sqrt(snr_eff))
            results[variant] += ber_sum / bits_per_trial
    for k in results:
        results[k] /= num_trials
    return results

def simulate_sir_for_sequence(hops_seq: np.ndarray, channels: int, snr_db: float, num_users: int, jammer_fraction: float):
    if hops_seq.size == 0:
        return float("-inf")
    snr_lin = max(10 ** (snr_db / 10), 1e-12)
    noise_power = get_signal_power() / snr_lin
    num_jammed = max(1, int(channels * jammer_fraction))
    jammed = set(np.random.choice(channels, num_jammed, replace=False))
    other_users = np.random.randint(0, channels, size=(num_users, hops_seq.size))
    sir_vals = []
    for i, hop in enumerate(hops_seq):
        collisions = np.count_nonzero(other_users[:, i] == hop)
        interference = collisions * get_user_int_power()
        if hop in jammed:
            interference += get_jammer_int_power()
        sir_eff = get_signal_power() / max(noise_power + interference, 1e-12)
        sir_vals.append(sir_eff)
    avg = float(np.mean(sir_vals))
    return 10 * math.log10(avg)

def true_consecutive_collision_probability(hops_seq: np.ndarray) -> float:
    if hops_seq.size < 2:
        return 0.0
    diffs = hops_seq[1:] - hops_seq[:-1]
    collisions = np.count_nonzero(diffs == 0)
    return float(collisions / (hops_seq.size - 1))

class SimRequest(BaseModel):
    pure_key: list
    csprng_key: list
    hybrid_key: list
    shape: list
    channels: int
    snr_db_list: list = [0, 5, 10, 15, 20]
    num_bits_per_trial: int = 1000
    num_trials: int = 5
    jammer_fraction: float = 0.2
    bits_per_cell: int = 1
    num_users: int = 20

@router.post("/simulate")
def run_simulation(req: SimRequest):
    """Run BER/SIR/Collision simulation on the provided keys."""
    try:
        pure = np.array(req.pure_key, dtype=np.uint8)
        rnd = np.array(req.csprng_key, dtype=np.uint8)
        hybrid = np.array(req.hybrid_key, dtype=np.uint8)
        
        hops_pure = key_to_hops(pure, req.channels, req.bits_per_cell)
        hops_rnd = key_to_hops(rnd, req.channels, req.bits_per_cell)
        
        raw_hops_hybrid = key_to_hops(hybrid, req.channels, req.bits_per_cell)
        hops_hybrid = apply_adaptive_hopping(
            raw_hops_hybrid, 
            req.channels, 
            interference_seq=hops_rnd
        )
        
        sequences = {
            "pure": hops_pure,
            "random": hops_rnd,
            "hybrid": hops_hybrid
        }
        
        coll_results = {
            "pure": [true_collision_probability(hops_pure)],
            "random": [true_collision_probability(hops_rnd)],
            "hybrid": [true_collision_probability(hops_hybrid)]
        }
        
        consecutive_results = {
            "pure": [true_consecutive_collision_probability(hops_pure)],
            "random": [true_consecutive_collision_probability(hops_rnd)],
            "hybrid": [true_consecutive_collision_probability(hops_hybrid)]
        }
        
        ber_results = {k: [] for k in sequences.keys()}
        sir_results = {k: [] for k in sequences.keys()}
        
        for snr in req.snr_db_list:
            ber_out = simulate_effective_snr_ber(
                snr_db=snr,
                channels=req.channels,
                jammer_fraction=req.jammer_fraction,
                num_users=req.num_users,
                hops_sequences=sequences,
                num_trials=req.num_trials,
                bits_per_trial=req.num_bits_per_trial
            )
            for k, val in ber_out.items():
                ber_results[k].append(val)
                
            for k, seq in sequences.items():
                val = simulate_sir_for_sequence(
                    seq, 
                    req.channels, 
                    snr, 
                    req.num_users, 
                    req.jammer_fraction
                )
                sir_results[k].append(val)

        security_scores = {
            "pure": calculate_security_score(hops_pure, req.channels),
            "random": calculate_security_score(hops_rnd, req.channels),
            "hybrid": calculate_security_score(hops_hybrid, req.channels)
        }

        grid_dim = int(math.ceil(math.sqrt(req.channels)))
        
        def get_heatmap(seq, size):
            counts = np.zeros(size*size)
            if seq.size > 0:
                unique, c = np.unique(seq, return_counts=True)
                for u, count in zip(unique, c):
                    if u < size*size:
                        counts[u] = count
                m = np.max(counts)
                if m > 0:
                    counts = counts / m
            return counts.reshape(size, size).tolist()

        heatmap_data = {
            "grid_size": grid_dim,
            "pure": get_heatmap(hops_pure, grid_dim),
            "random": get_heatmap(hops_rnd, grid_dim),
            "hybrid": get_heatmap(hops_hybrid, grid_dim)
        }

        response_sequences = {k: v.tolist() for k, v in sequences.items()}
        response_sequences["hybrid_raw"] = raw_hops_hybrid.tolist()

        return {
            "snr_db": req.snr_db_list,
            "ber": ber_results,
            "sir": sir_results,
            "collision_prob": coll_results,
            "consecutive_prob": consecutive_results,
            "security": security_scores,
            "heatmap": heatmap_data,
            "sequences": response_sequences
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")
