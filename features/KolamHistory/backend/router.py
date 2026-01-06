from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import os
import json
import base64
import time

router = APIRouter()

def _get_project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))

class RegisterKolamRequest(BaseModel):
    image_base64: str
    config: Dict[str, Any]

@router.post("/register-kolam")
def register_kolam(req: RegisterKolamRequest):
    """
    Save a generated Kolam image and its configuration to the backend database.
    This allows the image to be recognized by /lookup-image-config later.
    """
    try:
        project_root = _get_project_root()
        
        # 1. Generate unique filename
        timestamp = int(time.time())
        filename = f"kolam_gen_{timestamp}.png"
        config_filename = f"kolam_gen_{timestamp}.json"
        
        # 2. Save Image
        img_data = req.image_base64
        if "base64," in img_data:
            img_data = img_data.split("base64,")[1]
            
        img_bytes = base64.b64decode(img_data)
        
        images_dir = os.path.join(project_root, "backend", "generated_images")
        configs_dir = os.path.join(project_root, "backend", "generated_configs")
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(configs_dir, exist_ok=True)
        
        img_path = os.path.join(images_dir, filename)
        with open(img_path, "wb") as f:
            f.write(img_bytes)
            
        # 3. Save Config
        config_path = os.path.join(configs_dir, config_filename)
        with open(config_path, "w") as f:
            json.dump(req.config, f, indent=4)
            
        # 4. Update Mappings
        mapping_path = os.path.join(project_root, "backend", "data", "kolam_mappings.json")
        mappings = {}
        if os.path.exists(mapping_path):
            with open(mapping_path, "r") as f:
                try:
                    mappings = json.load(f)
                except:
                    mappings = {}
        
        mappings[filename] = f"../generated_configs/{config_filename}"
        
        with open(mapping_path, "w") as f:
            json.dump(mappings, f, indent=4)
            
        return {
            "status": "success", 
            "message": "Kolam registered successfully",
            "filename": filename,
            "download_url": f"/generated-images/{filename}" 
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {e}")

@router.get("/list-generated-kolams")
def list_generated_kolams():
    """
    List all automatically generated Kolam JSON configurations.
    """
    try:
        project_root = _get_project_root()
        configs_dir = os.path.join(project_root, "backend", "generated_configs")
        if not os.path.exists(configs_dir):
            return []
            
        files = [f for f in os.listdir(configs_dir) if f.endswith(".json")]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(configs_dir, x)), reverse=True)
        
        results = []
        for filename in files:
            filepath = os.path.join(configs_dir, filename)
            with open(filepath, "r") as f:
                try:
                    data = json.load(f)
                    results.append({
                        "filename": filename,
                        "created_at": os.path.getmtime(filepath),
                        "k": data.get("k"),
                        "symmetry": data.get("symmetry"),
                        "randomness": data.get("randomness")
                    })
                except:
                    continue
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list generated kolams: {e}")
