
from fastapi import APIRouter, HTTPException
import random
import numpy as np
from typing import List, Dict, Any
from backend.digital_twin_manager import digital_twin # Import Global Manager

from telecom_logic import (
    kolam_ultra_6g_final_pipeline,
    MassiveMIMO,
    NetworkSlicer,
    ntn_doppler_compensate,
    kolam_industrial_carrier_pipeline,
    kolam_product_protocol_pipeline
)

router = APIRouter(prefix="/telecom-admin", tags=["Telecom Admin"])

# Global state for simulation drills
simulation_state = {
    "attack_active": False,
    "attack_type": None,
    "drill_expiry": 0
}

@router.post("/trigger-attack")
async def trigger_attack(data: Dict[str, str]):
    """Triggers a transient attack drill for the dashboard."""
    import time
    simulation_state["attack_active"] = True
    simulation_state["attack_type"] = data.get("type", "NEURAL_SPOOF")
    simulation_state["drill_expiry"] = time.time() + 10 # 10 second drill
    return {"status": "Drill Initiated", "type": simulation_state["attack_type"]}

@router.get("/simulation-snapshot")
async def get_simulation_snapshot():
    """Returns a full snapshot of all 6G concepts for the admin dashboard."""
    import time
    # Update drill state
    if simulation_state["attack_active"] and time.time() > simulation_state["drill_expiry"]:
        simulation_state["attack_active"] = False
        simulation_state["attack_type"] = None

    mimo = MassiveMIMO(num_antennas=64)
    slicer = NetworkSlicer()
    
    # 1. OFDMA Resource Grid Frame
    grid = []
    for slot in range(16):
        # 8 subcarriers per slot
        scs = sorted(random.sample(range(64), 8))
        grid.append({"slot": slot, "subcarriers": scs})
        
    # 2. MIMO Beamforming Weights
    user_coords = [(random.uniform(0, 100), random.uniform(0, 100)) for _ in range(5)]
    beams = []
    for coord in user_coords:
        weights = [random.uniform(0.1, 1.0) for _ in range(16)] # Sample of 16 for UI
        beams.append({"coord": coord, "power": weights})
        
    # 3. ISAC Radar Targets
    targets = []
    for _ in range(random.randint(2, 5)):
        targets.append({
            "id": random.randint(100, 999),
            "distance": random.uniform(10, 100),
            "angle": random.uniform(0, 360),
            "velocity": random.uniform(-10, 50)
        })
        
    # 4. Global 6G Metadata
    pipeline_result = kolam_ultra_6g_final_pipeline("Simulating Peak 6G")
    
    # 5. NEW: Carrier-Grade Industrial Snapshot
    carrier_data = kolam_industrial_carrier_pipeline()
    
    # 6. NEW: Productization Tier (ASN.1 & CUDA Bridge)
    product_tier = kolam_product_protocol_pipeline()
    
    # 7. NEW: Business Value & Performance Analytics
    # Mocking a time-series of performance metrics
    analytics = []
    for i in range(10):
        analytics.append({
            "time": f"{i}s",
            "throughput": random.uniform(800, 1200) + (i * 50),
            "spectral_efficiency": random.uniform(15, 25),
            "quantum_immunity": random.uniform(99.0, 99.99),
            "cost_per_gb": max(0.01, 0.05 - (i * 0.003))
        })
    
    # 8. NEW: Security Hardening & Shield Status
    shields = {
        "lattice_sync": pipeline_result["geometric_defense"],
        "neural_guard": f"ACTIVE ({pipeline_result['neural_guard']})" if not simulation_state["attack_active"] else f"ATTACK_DETECTED ({simulation_state['attack_type']})",
        "dma_quota": "256MB / 4GB (Safe Limit)" if not simulation_state["attack_active"] else "THROTTLED (VRAM Flood Risk)",
        "pwc_lock": "HARD-LOCKED (Release 19)",
        "watermark_entropy": float(pipeline_result["probe_integrity"].replace('% Genuine', '')) / 100.0 if not simulation_state["attack_active"] else 0.42
    }

    return {
        "ofdma_grid": grid,
        "mimo_beams": beams,
        "isac_targets": targets,
        "slicing": slicer.slices,
        "quantum_status": pipeline_result,
        "carrier_data": carrier_data,
        "product_tier": product_tier,
        "analytics": analytics,
        "shields": shields,
        "timestamp": random.random() # To trigger UI updates
    }

@router.post("/login")
async def admin_login(data: Dict[str, str]):
    if data.get("username") == "admin" and data.get("password") == "kolam6g":
        return {"status": "success", "token": "KOLAM_ADMIN_TOKEN_6G"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

# -----------------------------------------------------------------------------
# DIGITAL TWIN ENDPOINTS (Real-Time Hardware Stats)
# -----------------------------------------------------------------------------

@router.post("/digital-twin/start")
async def start_digital_twin():
    """Starts the background Level 3 Simulation."""
    digital_twin.start_simulation()
    return {"status": "STARTED", "mode": "Level 3 (Async IO)"}

@router.post("/digital-twin/stop")
async def stop_digital_twin():
    """Stops the simulation."""
    digital_twin.stop_simulation()
    return {"status": "STOPPED"}

@router.get("/digital-twin/stats")
async def get_digital_twin_stats():
    """Returns real-time counters from the C++/GPU Engines."""
    return digital_twin.stats

@router.get("/metrics")
async def get_prometheus_metrics():
    """Exposes industrial-grade telemetry for Prometheus scraping."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi import Response
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

