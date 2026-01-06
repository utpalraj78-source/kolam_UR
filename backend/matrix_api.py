from fastapi import APIRouter, HTTPException
import numpy as np
from .kolam_generator import generate_kolam
from .utils import M_to_nibble_matrix

router = APIRouter()


@router.get("/generate-matrix")
def generate_matrix(symmetry: str, randomness: int, k: int, seed: int = 0,
                    layout: str = "Square grid (no rotate)", curve_color: str = "#800000", dot_color: str = "#000000"):
    """Return the per-cell combined matrix (k x k x 4) and optional allRows/allCols.

    This endpoint requests analysis from the generator but skips rendering PNG preview to
    keep the response compact unless the caller requests it separately.
    """
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

    # Build a human-readable text representation: one bracketed row per string.
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
