import streamlit as st
import numpy as np
from io import BytesIO
import json
import sys
import os
# Add parent directory to path to allow importing backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.kolam_generator import generate_kolam, make_animation_gif_bytes, render_preview_png_bytes

SAMPLE_IMG_PATH = "/mnt/data/7db4346c-46b3-4ca1-943d-3f7ead69720b.png"

st.set_page_config(page_title="Kolam Generator — improved UI", layout="wide")
st.title("Kolam Generator — improved UI (separate generate/download/color controls)")

with st.sidebar:
    st.header("Layout & Generation")
    layout = st.selectbox("Layout", ["Square grid (no rotate)", "Diamond grid (rotate 45°)"])
    symmetry = st.selectbox("Symmetry", ['Radial','90 Degree','180 Degree','Diagonal','Square',
                                        'Vertical','Horizontal','Diagonal Up','Diagonal Down', 'Random'])
    randomness = st.slider("Randomness (m)", 2, 9, 4)
    grid_size = st.number_input("Grid Size (k)", min_value=1, max_value=200, value=9, step=1)
    seed = st.number_input("Random seed (0 = system)", min_value=0, value=0, step=1)

    st.markdown("---")
    st.header("Colors")
    curve_color = st.color_picker("Curve color", value="#800000")
    dot_color = st.color_picker("Dot color", value="#000000")

    st.markdown("---")
    st.header("Actions")
    generate_new = st.button("Generate New Kolam")
    generate_matrix = st.button("Generate Matrix (textual rows)")
    show_animation = st.button("Show Build Animation (symmetric)")
    st.write("")
    st.write("Export / Download")
    download_last_png = st.button("Download Last Kolam Image (PNG)")
    if os.path.exists(SAMPLE_IMG_PATH):
        with open(SAMPLE_IMG_PATH, "rb") as f:
            sample_bytes = f.read()
        st.download_button("Download sample uploaded image", sample_bytes, file_name=os.path.basename(SAMPLE_IMG_PATH), mime="image/png")
    st.markdown("---")
    st.caption("Generate New Kolam → then Generate Matrix or Show Build Animation. Use color pickers before generating for those colors.")

st.markdown("Use **Generate New Kolam** to create a kolam and preview it. **Generate Matrix** shows the per-cell combined binary matrix only when clicked.")

# session state
if 'M' not in st.session_state:
    st.session_state['M'] = None
if 'allRows' not in st.session_state:
    st.session_state['allRows'] = None
if 'allCols' not in st.session_state:
    st.session_state['allCols'] = None
if 'k' not in st.session_state:
    st.session_state['k'] = None
if 'last_png' not in st.session_state:
    st.session_state['last_png'] = None
if 'curve_color' not in st.session_state:
    st.session_state['curve_color'] = curve_color
if 'dot_color' not in st.session_state:
    st.session_state['dot_color'] = dot_color

# update colors
st.session_state['curve_color'] = curve_color
st.session_state['dot_color'] = dot_color

# Generate new kolam (compute analysis payload but don't show analysis unless asked)
if generate_new:
    k = int(grid_size)
    M, allRows, allCols, segments_payload, img_base64, png_bytes = generate_kolam(
        symmetry, randomness, k, seed=seed, layout=layout,
        curve_color=curve_color, dot_color=dot_color, analyze=True, return_preview=True
    )
    st.session_state['M'] = M
    st.session_state['allRows'] = allRows
    st.session_state['allCols'] = allCols
    st.session_state['k'] = k
    st.session_state['last_png'] = png_bytes
    st.success(f"New kolam generated and stored in session (k={k}). Use 'Generate Matrix' to view textual matrix, 'Show Build Animation' to create GIF, or 'Download Last Kolam Image' to save the PNG.")
    if png_bytes:
        st.image(png_bytes, caption=f"Kolam preview (k={k})", use_column_width=True)

# Generate Matrix (display analysis on demand)
if generate_matrix:
    if st.session_state['M'] is None:
        st.warning("No kolam in session. Click 'Generate New Kolam' first.")
    else:
        k = st.session_state['k']
        M = st.session_state['M']
        st.write(f"Combined binary matrix M (shape {M.shape}). Each cell shown as [top,bottom,left,right].")
        lines = []
        for r in range(k):
            row_elems = []
            for c in range(k):
                cell = M[r,c].tolist()
                row_elems.append(f"[{cell[0]},{cell[1]},{cell[2]},{cell[3]}]")
            lines.append(" ".join(row_elems))
        st.code("\n".join(lines), language=None)

        npz_buf = BytesIO()
        np.savez_compressed(npz_buf, M=M, allRows=np.array(st.session_state['allRows']), allCols=np.array(st.session_state['allCols']))
        npz_buf.seek(0)
        st.download_button("Download matrices (.npz)", npz_buf.getvalue(), file_name=f"kolam_matrices_k{st.session_state['k']}.npz", mime="application/octet-stream")

        json_obj = {
            "k": k,
            "matrix": M.tolist(),
            "allRows": np.array(st.session_state['allRows']).tolist(),
            "allCols": np.array(st.session_state['allCols']).tolist(),
            "cell_order": ["top","bottom","left","right"]
        }
        st.download_button("Download matrices (.json)", json.dumps(json_obj).encode('utf-8'), file_name=f"kolam_matrices_k{k}.json", mime="application/json")

# Show Build Animation
if show_animation:
    if st.session_state['M'] is None:
        st.warning("No kolam in session. Click 'Generate New Kolam' first.")
    else:
        k = st.session_state['k']
        allRows = st.session_state['allRows']
        allCols = st.session_state['allCols']
        st.info("Creating symmetric animation frames (center-out). This may take a few seconds for medium grids; for large grids it samples frames.")
        gif_bytes = make_animation_gif_bytes(k, allRows, allCols, layout=layout, max_frames=120, curve_color=curve_color, dot_color=dot_color)
        if gif_bytes:
            st.image(gif_bytes, caption="Kolam build animation (symmetric, center-out)", use_column_width=True)
            st.download_button("Download animation (GIF)", gif_bytes, file_name=f"kolam_build_k{k}.gif", mime="image/gif")

# Download last PNG
if download_last_png:
    if st.session_state.get('last_png') is None:
        st.warning("No rendered PNG available. Click 'Generate New Kolam' to create and store a preview image first.")
    else:
        st.download_button("Download last kolam PNG", st.session_state['last_png'], file_name=f"kolam_k{st.session_state['k']}.png", mime="image/png")

if st.checkbox("Show small matrix preview (top-left 8×8)"):
    if st.session_state.get('M') is None:
        st.write("No matrix present. Generate a kolam first.")
    else:
        k = st.session_state['k']
        M = st.session_state['M']
        preview_n = min(8, k)
        preview = [[[int(x) for x in M[r,c].tolist()] for c in range(preview_n)] for r in range(preview_n)]
        st.write(preview)

st.markdown("---")
st.caption("Notes: Matrix display appears only when you click 'Generate Matrix'. Use color pickers before generating previews/animations so the chosen colors are applied. Sample uploaded image path included for developer use: " + SAMPLE_IMG_PATH)
