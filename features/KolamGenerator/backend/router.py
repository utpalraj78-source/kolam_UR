from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional
import numpy as np
import base64
import json
import os
import sys

# Adjust path to allow imports from backend
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from backend.kolam_generator import generate_kolam, SYMMETRY_MAP, randomKolam, make_animation_gif_bytes
from backend.utils import (
    compute_binary_from_M,
    flatten_and_repeat,
    M_to_nibble_matrix
)
from backend.algo import generate_keys_from_binary

router = APIRouter()

# -------------------------------------------------------------------------
# REQUEST MODELS
# -------------------------------------------------------------------------

class KolamRequest(BaseModel):
    symmetry: str
    randomness: float
    k: int
    seed: int
    mod: int = 2
    bits_per_cell: int = 1
    min_hops: int = 100
    layout: str = "Square grid (no rotate)"
    curve_color: str = "#800000"
    dot_color: str = "#000000"
    grid_color: Optional[str] = None
    # Added for keyed/ctr/t generation
    key: Optional[str] = None
    ctr: int = 0
    t: int = 0
    multi_color_palette: Optional[str] = None # JSON string of colors

class GenerateFromMLRequest(BaseModel):
    k: Optional[int] = 12
    symmetry: Optional[str] = "radial"
    randomness: Optional[float] = 0.0
    seed: Optional[int] = 0
    curve_color: Optional[str] = "#800000"
    dot_color: Optional[str] = "#000000"
    layout: Optional[str] = "Square grid (no rotate)"

class CompareMLRequest(BaseModel):
    ml_image: str  # base64
    algo_image: str # base64

# -------------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------------

@router.post("/generate-kolam-key")
def generate_kolam_key(req: KolamRequest):
    """Generate kolam matrix + keys and return JSON including a base64 PNG preview."""
    try:
        gen_seed = req.seed
        if req.key:
            from backend.fhss_utils import get_hmac_seed
            gen_seed = get_hmac_seed(req.key, req.ctr, req.t)
        
        meta = {
            "kolam_params": json.dumps({
                "symmetry": req.symmetry,
                "randomness": req.randomness,
                "k": req.k,
                "seed": gen_seed,
                "mod": req.mod,
                "bits_per_cell": req.bits_per_cell,
                "min_hops": req.min_hops,
                "layout": req.layout,
                "curve_color": req.curve_color,
                "dot_color": req.dot_color,
                "key": req.key,
                "ctr": req.ctr,
                "t": req.t,
            }),
            "multi_color_palette": req.multi_color_palette
        }
        result = generate_kolam(
            req.symmetry,
            req.randomness,
            req.k,
            gen_seed,
            analyze=True,
            return_preview=True,
            layout=req.layout,
            curve_color=req.curve_color,
            dot_color=req.dot_color,
            grid_color=req.grid_color,
            metadata=meta,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Kolam generation failed: {e}")
    if len(result) >= 3:
        M = np.array(result[0])
        segments = result[3] if len(result) > 3 else None
        img_b64 = result[4] if len(result) > 4 else None
        png_bytes = result[5] if len(result) > 5 else None
    else:
        raise HTTPException(status_code=500, detail="generate_kolam returned unexpected structure")
    try:
        B = compute_binary_from_M(M)
        _ = flatten_and_repeat(B, req.min_hops)
        pure, rnd, hybrid = generate_keys_from_binary(B, req.mod, req.bits_per_cell, key=req.key, ctr=req.ctr, t=req.t)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Post-processing failed: {e}")
    png_b64 = base64.b64encode(png_bytes).decode('utf-8') if png_bytes is not None else img_b64
    
    # --- AUTO-SAVE TO DATABASE (User Request) ---
    saved_filename = None
    try:
        import time
        
        # 1. Generate Filename
        timestamp = int(time.time())
        filename = f"kolam_gen_{timestamp}.png"
        config_filename = f"kolam_gen_{timestamp}.json"
        
        # 2. Save Image
        # Save relative to backend/generated_images
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
        images_dir = os.path.join(project_root, "backend", "generated_images")
        configs_dir = os.path.join(project_root, "backend", "generated_configs")
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(configs_dir, exist_ok=True)
        
        if png_bytes:
            img_path = os.path.join(images_dir, filename)
            with open(img_path, "wb") as f:
                f.write(png_bytes)
                
            # 3. Save Config
            config_dict = {
                "symmetry": req.symmetry,
                "randomness": req.randomness,
                "k": req.k,
                "seed": gen_seed,
                "mod": req.mod,
                "bits_per_cell": req.bits_per_cell,
                "min_hops": req.min_hops,
                "layout": req.layout,
                "curve_color": req.curve_color,
                "dot_color": req.dot_color,
                "grid_color": req.grid_color,
                "key": req.key,
                "ctr": req.ctr,
                "t": req.t,
                "multi_color_palette": req.multi_color_palette
            }
            config_path = os.path.join(configs_dir, config_filename)
            with open(config_path, "w") as f:
                json.dump(config_dict, f, indent=4)
                
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
                
            saved_filename = filename
            
    except Exception as e:
        print(f"DEBUG: Auto-save failed: {e}")

    return {
        "pure_key": pure.flatten().tolist(),
        "csprng_key": rnd.flatten().tolist(),
        "hybrid_key": hybrid.flatten().tolist(),
        "shape": [req.k, req.k],
        "bits_per_cell": req.bits_per_cell,
        "matrix_binary": B.tolist(),
        "matrix_raw": M.tolist(),
        "segments": segments,
        "kolam_image_base64": img_b64,
        "kolam_image_png_base64": png_b64,
        "filename": saved_filename
    }

@router.get("/kolam-preview")
def get_kolam_preview(symmetry: str, randomness: float, k: int, seed: int = 0,
                      layout: str = "Square grid (no rotate)",
                      curve_color: str = "#800000", dot_color: str = "#000000",
                      mod: int = 256, bits_per_cell: int = 4, min_hops: int = 10,
                      grid_color: Optional[str] = None, multi_color_palette: Optional[str] = None):
    """Generate and return a PNG preview of the Kolam."""
    try:
        meta = {
            "kolam_dict": json.dumps({
               "symmetry": symmetry, "randomness": randomness, "k": k, "seed": seed,
               "mod": mod, "bits_per_cell": bits_per_cell, "min_hops": min_hops,
               "layout": layout, "curve_color": curve_color, "dot_color": dot_color
            }),
            "multi_color_palette": multi_color_palette
        }
        result = generate_kolam(symmetry, randomness, k, seed, analyze=False, return_preview=True,
                                layout=layout, curve_color=curve_color, dot_color=dot_color, grid_color=grid_color,
                                metadata=meta)
        png_bytes = result[5]
        if not png_bytes:
             raise ValueError("No PNG generated")
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/kolam-animation")
def get_kolam_animation(symmetry: str, randomness: float, k: int, seed: int = 0,
                        layout: str = "Square grid (no rotate)",
                        curve_color: str = "#800000", dot_color: str = "#000000",
                        multi_color_palette: Optional[str] = None):
    """Generate and return a GIF animation of the Kolam build."""
    try:
        builder = SYMMETRY_MAP.get(str(symmetry).lower(), randomKolam)
        if seed != 0:
            np.random.seed(int(seed))
        else:
            np.random.seed(None)
            
        allRows, allCols = builder(randomness, k)
        
        # Prepare metadata
        meta = None
        if multi_color_palette:
            meta = {"multi_color_palette": multi_color_palette}

        gif_bytes = make_animation_gif_bytes(k, allRows, allCols, layout=layout, 
                                             curve_color=curve_color, dot_color=dot_color, metadata=meta)
        return Response(content=gif_bytes, media_type="image/gif")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/generate-matrix")
def generate_matrix_endpoint(symmetry: str, randomness: int, k: int, seed: int = 0,
                    layout: str = "Square grid (no rotate)", curve_color: str = "#800000", dot_color: str = "#000000"):
    """Return the per-cell combined matrix (k x k x 4)."""
    try:
        result = generate_kolam(symmetry, randomness, k, seed, analyze=True, return_preview=False,
                    layout=layout, curve_color=curve_color, dot_color=dot_color)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Matrix generation failed: {e}")

    if not result or len(result) < 3:
        raise HTTPException(status_code=500, detail="generate_kolam returned unexpected structure")

    M = np.array(result[0])
    all_rows = result[1]
    all_cols = result[2]

    matrix_text = []
    for row in M:
        cell_strs = [f"[{','.join(str(int(x)) for x in cell)}]" for cell in row]
        row_str = "[" + " ".join(cell_strs) + "]"
        matrix_text.append(row_str)

    return {
        "matrix_raw": M.tolist(),
        "matrix_text": matrix_text,
        "matrix_nibble": M_to_nibble_matrix(M).tolist(),
        "allRows": all_rows,
        "allCols": all_cols,
        "k": k,
    }

# -------------------------------------------------------------------------
# ML ENDPOINTS
# -------------------------------------------------------------------------

def _load_ml_decoder():
    import torch
    from pathlib import Path
    try:
        from backend.ml_models.kolam_decoder import KolamDecoder
    except ImportError:
        # Fallback if imports are tricky
        from backend.ml_models.kolam_decoder import KolamDecoder
        
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
    model_path = os.path.join(project_root, "backend", "ml_models", "decoder_final.pt")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Kolam decoder model not found at {model_path}. Train the model first.")
        
    decoder = KolamDecoder(cond_dim=40, latent_dim=64, img_size=512)
    decoder.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    decoder.eval()
    print("✅ ML Kolam decoder loaded.")
    return decoder

def _build_cond_vector(req: GenerateFromMLRequest):
    import torch
    k_vec = torch.zeros(12)
    if req.k:
        k_vec[req.k - 1] = 1.0
    sym_list = ["radial", "square", "diagonal", "hexagonal", "none"]
    sym_vec = torch.zeros(len(sym_list))
    if req.symmetry and req.symmetry.lower() in sym_list:
        sym_vec[sym_list.index(req.symmetry.lower())] = 1.0
    rnd = torch.tensor([ (req.randomness or 0) / 9.0 ], dtype=torch.float32)
    seed_val = req.seed or 0
    seed_bytes = np.frombuffer(int(seed_val).to_bytes(4, "little"), dtype=np.uint8) / 255.0
    seed_vec = torch.tensor(seed_bytes.astype(np.float32))
    def hex_to_rgb(hex_str: str):
        h = hex_str.lstrip("#")
        return torch.tensor([int(h[i:i+2], 16) / 255.0 for i in (0,2,4)], dtype=torch.float32)
    curve_rgb = hex_to_rgb(req.curve_color or "#800000")
    dot_rgb = hex_to_rgb(req.dot_color or "#000000")
    layout_list = ["Square grid (no rotate)", "Rotated grid", "Diamond grid"]
    layout_vec = torch.zeros(len(layout_list))
    if req.layout and req.layout in layout_list:
        layout_vec[layout_list.index(req.layout)] = 1.0
    return torch.cat([k_vec, sym_vec, rnd, seed_vec, curve_rgb, dot_rgb, layout_vec], dim=0)

@router.post("/generate-from-ml")
def generate_from_ml(req: GenerateFromMLRequest):
    """Generate a Kolam image directly from the supplied parameters using the trained ML model."""
    try:
        import torch
        cond = _build_cond_vector(req).unsqueeze(0)
        decoder = _load_ml_decoder()
        with torch.no_grad():
            img_tensor = decoder(cond)
        img_np = (img_tensor.squeeze(0).permute(1, 2, 0).numpy() * 255).astype(np.uint8)
        import io, base64, PIL.Image
        buf = io.BytesIO()
        PIL.Image.fromarray(img_np).save(buf, format="PNG")
        png_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return {
            "kolam_image_png_base64": png_b64,
            "k": req.k,
            "symmetry": req.symmetry,
            "randomness": req.randomness,
            "seed": req.seed
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ML Generation failed: {e}")

@router.post("/compare-ml-gen")
def compare_ml_gen(req: CompareMLRequest):
    """Compare the ML generated image with the algorithmic one via SSIM/MSE."""
    try:
        import base64
        from PIL import Image
        import io
        from skimage.metrics import structural_similarity as ssim
        from skimage.metrics import mean_squared_error
        from skimage.transform import resize

        def load_b64(b64_str):
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            return np.array(Image.open(io.BytesIO(base64.b64decode(b64_str))).convert("L"))

        img1 = load_b64(req.ml_image)
        img2 = load_b64(req.algo_image)

        img2_resized = resize(img2, img1.shape, anti_aliasing=True, preserve_range=True).astype(np.uint8)

        score_ssim = ssim(img1, img2_resized, data_range=255)
        score_mse = mean_squared_error(img1, img2_resized)

        return {
            "ssim": float(score_ssim),
            "mse": float(score_mse),
            "match_percentage": float(max(0, score_ssim) * 100)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {e}")
