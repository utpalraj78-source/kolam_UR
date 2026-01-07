import uvicorn
import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    # Fix OpenMP conflict
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    # Set DEV environment so auth.py's security check allows the fallback setup
    os.environ["ENV"] = "development" 
    
    print("Starting Kolam Backend via run_backend.py on port 8081...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8081, reload=True, reload_dirs=["backend"], reload_excludes=["backend/generated_images", "backend/generated_configs", "backend/kolam_chat.db"])  # nosec B104
