# collect_training_data.py
"""Utility to generate a large set of (JSON request → PNG image) pairs.
It calls the running backend (default http://127.0.0.1:8081) and stores:
* the original request parameters (meta.json)
* the generated matrix (matrix.npy) – optional but useful for future models
* the rendered PNG (image.png)

Run it after the backend is up:
    python scripts/collect_training_data.py --samples 20000 --out data/kolam_ml
"""
import argparse, os, json, base64, pathlib, random
import requests
import numpy as np

DEFAULT_URL = os.getenv("COLLECT_API_URL", "http://127.0.0.1:8081")

def post_json(payload: dict) -> dict:
    r = requests.post(f"{DEFAULT_URL}/generate-from-json", json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

def save_sample(idx: int, resp: dict, out_dir: pathlib.Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    base = f"{idx:06d}"
    # matrix (if present)
    if "matrix_raw" in resp and resp["matrix_raw"] is not None:
        matrix = np.array(resp["matrix_raw"], dtype=np.uint8)
        np.save(out_dir / f"{base}_matrix.npy", matrix)
    # PNG image
    png_b64 = resp.get("kolam_image_png_base64") or resp.get("kolam_image_base64")
    if png_b64:
        png_bytes = base64.b64decode(png_b64)
        (out_dir / f"{base}_image.png").write_bytes(png_bytes)
    # meta (parameters only)
    meta = {
        "k": resp.get("k"),
        "symmetry": resp.get("symmetry"),
        "randomness": resp.get("randomness_m") or resp.get("randomness"),
        "seed": resp.get("seed"),
        "layout": resp.get("layout"),
        "curve_color": resp.get("curve_color"),
        "dot_color": resp.get("dot_color"),
    }
    (out_dir / f"{base}_meta.json").write_text(json.dumps(meta, indent=2))

def random_payload():
    # generate a random but valid payload for the deterministic generator
    sym_list = ["radial", "square", "diagonal", "hexagonal", "none"]
    layout_list = ["Square grid (no rotate)", "Rotated grid", "Diamond grid"]
    payload = {
        "symmetry": random.choice(sym_list),
        "randomness": random.randint(0, 9),
        "k": random.choice([8, 9, 10, 11, 12]),
        "seed": random.randint(0, 2**31 - 1),
        "layout": random.choice(layout_list),
        "curve_color": "#800000",
        "dot_color": "#000000",
    }
    return payload

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=5000, help="Number of JSON→PNG pairs to generate")
    parser.add_argument("--out", default="data/kolam_ml", help="Output directory for the dataset")
    args = parser.parse_args()

    out_dir = pathlib.Path(args.out)
    for i in range(args.samples):
        payload = random_payload()
        try:
            resp = post_json(payload)
            save_sample(i, resp, out_dir)
        except Exception as e:
            print(f"[WARN] sample {i} failed: {e}")

if __name__ == "__main__":
    main()
