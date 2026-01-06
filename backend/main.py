# main.py
# FINAL CLEAN FASTAPI BACKEND — Kolam FHSS Platform
# Structure: Modular Features

import os
import sys

# Ensure backend and features are importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# Append root to path so 'features' is importable if running from backend
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Database initialization
from database import engine, Base
from models import User, KolamHistory, ChatSession, ChatMessage
from features.KolamCaptcha.backend.models import CaptchaChallenge # Import here so create_all sees it

# Create all tables
Base.metadata.create_all(bind=engine)

# Feature Routers
from features.KolamGenerator.backend.router import router as kolam_gen_router
from features.KolamFromJson.backend.router import router as kolam_restore_router
from features.FrequencyHopping.backend.router import router as freq_hop_router
from features.HopCompare.backend.router import router as hop_compare_router
from features.KolamChat.backend.router import router as chat_router
from features.KolamHistory.backend.router import router as history_router

# New Authentication & Kolam History Routers
from routers.auth_router import router as auth_router
from routers.kolam_history_router import router as kolam_history_router
from routers.secure_chat_router import router as secure_chat_router
from routers.telecom_admin_router import router as telecom_admin_router

app = FastAPI(title="Kolam FHSS Backend — Modular Architecture")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# O-RAN Microservices Split Logic
oran_layer = os.getenv("ORAN_LAYER", "ALL").upper()

if oran_layer in ["ALL", "CU"]:
    # Central Unit (Control Plane, Auth, History)
    app.include_router(auth_router)
    app.include_router(kolam_history_router)
    app.include_router(history_router)
    app.include_router(telecom_admin_router) # Admin Dashboard usually in CU
    app.include_router(secure_chat_router) # App logic in CU

if oran_layer in ["ALL", "DU"]:
    # Distributed Unit (High-PHY, Kolam Logic)
    app.include_router(kolam_gen_router)
    app.include_router(kolam_restore_router)
    app.include_router(freq_hop_router)
    app.include_router(hop_compare_router)
    app.include_router(chat_router) # Message handling often in DU/CU boundary

if oran_layer in ["ALL", "RU"]:
    # Radio Unit (Low-PHY) - usually dumb, but might expose diagnostics
    pass # RU logic is mostly in hardware drivers, not REST API

@app.get("/system-status")
def system_status():
    return {"status": "ACTIVE", "oran_role": oran_layer}

# Captcha Router
from features.KolamCaptcha.backend.router import router as captcha_router
app.include_router(captcha_router)

# Mount Generated Images (Important for UI previews)
# Assuming 'generated_images' is in 'backend/generated_images'
img_dir = os.path.join(os.path.dirname(__file__), "generated_images")
os.makedirs(img_dir, exist_ok=True)
app.mount("/generated-images", StaticFiles(directory=img_dir), name="generated-images")

# Mount Generated Configs (Optional, but good for debugging)
cfg_dir = os.path.join(os.path.dirname(__file__), "generated_configs")
os.makedirs(cfg_dir, exist_ok=True)
app.mount("/generated_configs", StaticFiles(directory=cfg_dir), name="generated_configs")

@app.get("/")
def read_root():
    return {"message": "Kolam FHSS Backend Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
