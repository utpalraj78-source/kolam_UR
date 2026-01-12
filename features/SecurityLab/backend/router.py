
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import time
import asyncio
import numpy as np
import os
from backend.hackrf_bridge import HackRFBridge
from backend.digital_twin_manager import digital_twin

router = APIRouter(prefix="/security-lab", tags=["Security Lab"])

from .interference_engine import generate_hybrid_seed, get_hybrid_hops, generate_bt_interference_data

class DrillState:
    def __init__(self):
        self.active = False
        self.under_attack = False
        self.bluetooth_mode = False
        self.attack_frequency = 2437000000 
        self.current_frequency = 2437000000
        self.logs = []
        self.thread_active = False

drill_state = DrillState()

class StartDrillRequest(BaseModel):
    duration_minutes: int = 3

@router.get("/status")
async def get_status():
    try:
        # Extremely defensive casting for JSON safety
        return {
            "active": bool(drill_state.active),
            "under_attack": bool(drill_state.under_attack),
            "bluetooth_mode": bool(drill_state.bluetooth_mode),
            "current_frequency": int(drill_state.current_frequency),
            "attack_frequency": int(drill_state.attack_frequency),
            "logs": [str(log) for log in drill_state.logs[-15:]] if drill_state.logs else []
        }
    except Exception as e:
        return {"error": str(e), "active": False}

async def run_drill_task():
    # FORCE CLEANUP
    try:
        os.system("taskkill /F /IM hackrf_transfer.exe /T")
        await asyncio.sleep(0.5)
    except:
        pass

    bridge = HackRFBridge()
    if not bridge.available:
        drill_state.logs.append("ERROR: Hardware Busy.")
        drill_state.active = False
        return

    if drill_state.bluetooth_mode:
        drill_state.logs.append("KOLAM BT-DOMINANCE: Initializing Hybrid Seed FHSS...")
        # 1. Generate specialized Kolam noise
        bt_data = generate_bt_interference_data()
        iq_path = os.path.join(os.getcwd(), "bt_jam.c8")
        bridge.save_to_file(bt_data.tolist(), filename=iq_path)
        
        # 2. Derive Seed
        seed = generate_hybrid_seed()
        # WIDEBAND BLOCKS: Covers the whole 80MHz BT band in 4 jumps
        bt_blocks = [2412e6, 2432e6, 2452e6, 2472e6]
        hop_sequence = get_hybrid_hops(seed, 200, 4)
        
        bridge.sample_rate = 20000000 # 20Msps
        
        try:
            hop_idx = 0
            while drill_state.active and drill_state.bluetooth_mode:
                block_idx = hop_sequence[hop_idx % len(hop_sequence)]
                drill_state.current_frequency = int(bt_blocks[block_idx])
                bridge.frequency = drill_state.current_frequency
                
                # Physical TX (Now 50ms per burst)
                bridge.transmit(filename=iq_path)
                
                if hop_idx % 4 == 0:
                    drill_state.logs.append(f"BT-WIDEBAND SATURATION: {drill_state.current_frequency/1e6} MHz (Block Active)")
                
                hop_idx += 1
                # No sleep here - maximize duty cycle
        except Exception as e:
            drill_state.logs.append(f"BT Error: {str(e)}")
        finally:
            drill_state.active = False
            drill_state.logs.append("BT-Dominance Mode Ceased.")
        return

    # --- STANDARD DRILL LOGIC ---
    drill_state.logs.append("Starting 6G Downlink - Secure FHSS Active")
    
    # Pre-generate data (Shorter burst for faster hopping responsiveness)
    data = (np.random.normal(0, 0.4, 500000) + 1j * np.random.normal(0, 0.4, 500000))
    iq_path = os.path.join(os.getcwd(), "drill_data.c8")
    bridge.save_to_file(data.tolist(), filename=iq_path)
    
    bridge.sample_rate = 10000000
    wifi_channels = [2412000000, 2422000000, 2437000000, 2452000000, 2462000000]
    
    try:
        while drill_state.active:
            if drill_state.under_attack:
                safe_channels = [c for c in wifi_channels if c != drill_state.attack_frequency]
                drill_state.current_frequency = int(np.random.choice(safe_channels))
                drill_state.logs.append(f"JAMMING DETECTED. Evading to {drill_state.current_frequency/1e6} MHz")
            else:
                drill_state.current_frequency = int(np.random.choice(wifi_channels))
            
            bridge.frequency = drill_state.current_frequency
            await asyncio.sleep(0.01) # Settle time
            
            # Physical TX
            bridge.transmit(filename=iq_path)
            
            # Update Digital Twin
            if digital_twin.running:
                digital_twin.stats["throughput_mbps"] = 135.0 + np.random.uniform(-5, 5)
            
            await asyncio.sleep(0.1)
            
    except Exception as e:
        drill_state.logs.append(f"Drill Error: {str(e)}")
    finally:
        drill_state.active = False
        drill_state.logs.append("Security Drill Stopped")

@router.post("/start")
async def start_drill(background_tasks: BackgroundTasks):
    if drill_state.active:
        return {"message": "Drill already running"}
    
    drill_state.active = True
    drill_state.under_attack = False
    drill_state.logs.append("Initializing 6G Security Lab...")
    background_tasks.add_task(run_drill_task)
    return {"message": "Drill started"}

@router.post("/stop")
async def stop_drill():
    drill_state.active = False
    drill_state.bluetooth_mode = False
    return {"message": "Stopping drill"}

@router.post("/start-bluetooth-test")
async def start_bluetooth_test(background_tasks: BackgroundTasks):
    if drill_state.active:
        return {"message": "A test is already running"}
    
    drill_state.active = True
    drill_state.bluetooth_mode = True
    drill_state.logs.append("KOLAM PROJECT: BT-DOMINANCE PROTOCOL ENGAGED.")
    background_tasks.add_task(run_drill_task)
    return {"message": "Bluetooth dominance test started"}

@router.post("/toggle-attack")
async def toggle_attack():
    drill_state.under_attack = not drill_state.under_attack
    status = "STARTED" if drill_state.under_attack else "CEASED"
    drill_state.logs.append(f"JAMMING ATTACK {status}")
    return {"under_attack": drill_state.under_attack}
