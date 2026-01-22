# main.py
# FINAL CLEAN FASTAPI BACKEND — Kolam FHSS Platform
# Industry Ready Refactoring

import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Logging Configuration (Industry Standard) ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("kolam_backend.log")
    ]
)
logger = logging.getLogger("KolamBackend")

# Ensure backend and features are importable (Legacy Support)
# ideally, this would be replaced by installing the package via pip
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Database initialization
from database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from models import User, KolamHistory, ChatSession, ChatMessage
# Import feature models
try:
    from features.KolamCaptcha.backend.models import CaptchaChallenge
except ImportError:
    logger.warning("KolamCaptcha feature not found/installed.")

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
from features.SecurityLab.backend.router import router as security_lab_router
from features.KolamCaptcha.backend.router import router as captcha_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events: Startup and Shutdown logic.
    Industry standard for managing connections (DB, Cache, etc.)
    """
    logger.info("Starting up Kolam Backend Services...")
    
    # Create tables (In prod, use Alembic migrations instead)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # In a strict environment, we might strict-fail here, 
        # but for now we let it run.
    
    yield
    
    logger.info("Shutting down Kolam Backend Services...")
    # Close resources if needed (e.g. db connections)

app = FastAPI(
    title="Kolam FHSS Backend — Enterprise Edition",
    description="Secure, Modular, and O-RAN compliant backend for Kolam Frequency Hopping.",
    version="2.0.0",
    lifespan=lifespan
)

# --- Security: CORS ---
# In production, ALLOWED_ORIGINS should be a comma-separated string of specific domains
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = allowed_origins_env.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- O-RAN Microservices Split Logic ---
oran_layer = os.getenv("ORAN_LAYER", "ALL").upper()
logger.info(f"Initialized with O-RAN Layer Role: {oran_layer}")

if oran_layer in ["ALL", "CU"]:
    # Central Unit (Control Plane, Auth, History)
    app.include_router(auth_router)
    app.include_router(kolam_history_router)
    app.include_router(history_router)
    app.include_router(telecom_admin_router)
    app.include_router(secure_chat_router)
    app.include_router(security_lab_router)

if oran_layer in ["ALL", "DU"]:
    # Distributed Unit (High-PHY, Kolam Logic)
    app.include_router(kolam_gen_router)
    app.include_router(kolam_restore_router)
    app.include_router(freq_hop_router)
    app.include_router(hop_compare_router)
    app.include_router(chat_router)
    # Reset Captcha is usually a DU/CU function
    app.include_router(captcha_router)

if oran_layer in ["ALL", "RU"]:
    # Radio Unit (Low-PHY)
    pass

@app.get("/system-status", tags=["System"])
def system_status():
    return {"status": "ACTIVE", "oran_role": oran_layer, "version": "2.0.0"}

# --- Static Mounts ---
# Ensure directories exist
img_dir = os.path.join(os.path.dirname(__file__), "generated_images")
os.makedirs(img_dir, exist_ok=True)
app.mount("/generated-images", StaticFiles(directory=img_dir), name="generated-images")

cfg_dir = os.path.join(os.path.dirname(__file__), "generated_configs")
os.makedirs(cfg_dir, exist_ok=True)
app.mount("/generated_configs", StaticFiles(directory=cfg_dir), name="generated_configs")


@app.get("/", tags=["System"])
def read_root():
    return {"message": "Kolam FHSS Enterprise Backend Running"}

if __name__ == "__main__":
    import uvicorn
    # Industry Practice: Use env vars for host/port
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8081"))
    
    logger.info(f"Starting Server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)

