from fastapi import APIRouter, HTTPException, UploadFile, File
import os
import sys
import json
from PIL import Image
from io import BytesIO

# Adjust path to allow imports from backend if needed
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

router = APIRouter()

def _get_project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))

@router.post("/lookup-image-config")
async def lookup_image_config(file: UploadFile = File(...)):
    """
    Look up an image configuration.
    Priority 1: Extract embedded metadata (if PNG)
    Priority 2: Lookup filename in mapping database
    Priority 3: Fallback to test_kolam.json (k=4)
    """
    try:
        filename = file.filename
        content = await file.read()
        
        # 1. Try Metadata Extraction (Steganography/EXIF)
        try:
            img = Image.open(BytesIO(content))
            if img.info and "kolam_params" in img.info:
                # Found embedded metadata!
                params = json.loads(img.info["kolam_params"])
                return params # Return immediately
        except Exception as e:
            print(f"Metadata extraction failed: {e}")
        
        # 2. Try Filename Mapping
        project_root = _get_project_root()
        mapping_path = os.path.join(project_root, "backend", "data", "kolam_mappings.json")
        target_json = None
        
        if os.path.exists(mapping_path):
            with open(mapping_path, "r") as f:
                mappings = json.load(f)
            target_json = mappings.get(filename)
            
        if not target_json:
             print(f"Warning: {filename} not in mapping, using fallback 'test_kolam.json' for demo.")
             target_json = "test_kolam.json"

        # Load the JSON config
        json_path = os.path.join(project_root, "backend", "data", target_json)
        if not os.path.exists(json_path):
             # Handle relative paths from mapping like "../generated_configs/..."
             if target_json.startswith("../"):
                 # Resolve relative to data dir
                 base = os.path.join(project_root, "backend", "data")
                 json_path = os.path.abspath(os.path.join(base, target_json))

             if not os.path.exists(json_path):
                 # Last ditch: try generated_configs directly if name matches
                 gen_path = os.path.join(project_root, "backend", "generated_configs", target_json)
                 if os.path.exists(gen_path):
                     json_path = gen_path
                 else:
                     raise HTTPException(status_code=500, detail=f"Configuration file {target_json} not found.")

        with open(json_path, "r") as f:
            config = json.load(f)
        
        return config

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("DEBUG: Image lookup exception:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image lookup failed: {e}")

@router.post("/generate-from-image-mapping")
async def generate_from_image_mapping(file: UploadFile = File(...)):
    """
    Generate Kolam from uploaded image.
    Uses metadata extraction first, then filename mapping.
    """
    try:
        filename = file.filename
        content = await file.read()
        
        print(f"DEBUG: Processing upload {filename}, size={len(content)}")
        
        config = None
        
        # 1. Try Metadata
        try:
            img = Image.open(BytesIO(content))
            if img.info and "kolam_params" in img.info:
                config = json.loads(img.info["kolam_params"])
        except Exception as e:
            print(f"DEBUG: Metadata extraction error: {e}")
            
        # 2. Try Mapping if no metadata
        project_root = _get_project_root()
        if not config:
            mapping_path = os.path.join(project_root, "backend", "data", "kolam_mappings.json")
            target_json = None
            if os.path.exists(mapping_path):
                with open(mapping_path, "r") as f:
                    mappings = json.load(f)
                target_json = mappings.get(filename)
                
            if not target_json:
                target_json = "test_kolam.json"
            
            base = os.path.join(project_root, "backend", "data")
            json_path = os.path.join(base, target_json)
            
            if target_json.startswith("../"):
                 json_path = os.path.abspath(os.path.join(base, target_json))
            
            if not os.path.exists(json_path):
                 alt = os.path.join(project_root, "backend", "generated_configs", os.path.basename(target_json))
                 if os.path.exists(alt):
                     json_path = alt
            
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    config = json.load(f)
                    
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found for image.")
            
        # Now call generation logic (Generate Kolam Key) but directly
        # We need to construct req object and call generator
        # Ideally we reuse the logic from KolamGenerator router.
        # But we can import the function `generate_kolam` and replicate `generate_kolam_key` logic partially OR just return the config?
        # The endpoint expects to return the generated data (same as /generate-kolam-key)
        
        # Let's import the router from KolamGenerator and call its function directly?
        # Or cleaner: Duplicate the simple logic (it uses `generate_kolam`).
        
        from backend.kolam_generator import generate_kolam
        from backend.utils import compute_binary_from_M, flatten_and_repeat
        from backend.algo import generate_keys_from_binary
        import numpy as np
        import base64
        
        # Extract params
        symmetry = config.get("symmetry", "radial")
        randomness = config.get("randomness", config.get("randomness_m", 0.0))
        k = config.get("k", config.get("grid_size_k", 12))
        seed = config.get("seed", 0)
        mod = config.get("mod", config.get("mod_value", 2))
        bits_per_cell = config.get("bits_per_cell", 1)
        min_hops = config.get("min_hops", 100)
        layout = config.get("layout", "Square grid (no rotate)")
        curve_color = config.get("curve_color", "#800000")
        dot_color = config.get("dot_color", "#000000")
        key = config.get("key")
        ctr = config.get("ctr", 0)
        t = config.get("t", 0)
        
        if key:
             from backend.fhss_utils import get_hmac_seed
             gen_seed = get_hmac_seed(key, ctr, t)
        else:
             gen_seed = seed
             
        meta = {"kolam_params": json.dumps(config)}
        
        result = generate_kolam(
            symmetry, randomness, k, gen_seed,
            analyze=True, return_preview=True,
            layout=layout, curve_color=curve_color, dot_color=dot_color,
            metadata=meta
        )
        
        if len(result) >= 3:
            M = np.array(result[0])
            segments = result[3] if len(result) > 3 else None
            img_b64 = result[4] if len(result) > 4 else None
            png_bytes = result[5] if len(result) > 5 else None
        else:
            raise HTTPException(status_code=500, detail="Generation failed")

        B = compute_binary_from_M(M)
        _ = flatten_and_repeat(B, min_hops)
        pure, rnd, hybrid = generate_keys_from_binary(B, mod, bits_per_cell, key=key, ctr=ctr, t=t)
        
        png_b64 = base64.b64encode(png_bytes).decode('utf-8') if png_bytes is not None else img_b64
        
        return {
            "pure_key": pure.flatten().tolist(),
            "csprng_key": rnd.flatten().tolist(),
            "hybrid_key": hybrid.flatten().tolist(),
            "shape": [k, k],
            "bits_per_cell": bits_per_cell,
            "matrix_binary": B.tolist(),
            "matrix_raw": M.tolist(),
            "segments": segments,
            "kolam_image_base64": img_b64,
            "kolam_image_png_base64": png_b64,
            "filename": filename # Return original filename
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
