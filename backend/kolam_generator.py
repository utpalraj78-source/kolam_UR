# kolam_generator.py
# CLEAN BACKEND VERSION OF YOUR STREAMLIT KOLAM GENERATOR (NO UI)

import base64
from io import BytesIO
import math
import os

# FORCE AGG BACKEND GLOBALLY TO PREVENT CRASHES
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from typing import List, Tuple
from PIL import Image
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg

# Optional imports for ML model
try:
    import torch
except ImportError:
    torch = None

try:
    from model import KolamVAE
except ImportError:
    try:
        from .model import KolamVAE
    except ImportError:
        KolamVAE = None

pi = np.pi
rt = 2**0.5

# -----------------------------------------------------
# Geometry helper functions (unchanged from Streamlit)
# -----------------------------------------------------
def sqPoints(x0, y0, f):
    return [(x0+f, y0), (x0, y0+f), (x0-f, y0), (x0, y0-f), (x0+f, y0)]

def circlePoints(x0, y0, f):
    rad = f * rt
    out = []
    for t in range(0, 361, 6):
        x = x0 + (rad - f) * math.cos(t * pi / 180)
        y = y0 + (rad - f) * math.sin(t * pi / 180)
        out.append((x, y))
    return out

def loopPoints(angle, x0, y0, f):
    rad = f * rt
    out = []
    x1 = -f
    x2 = f
    for t in range(0, 361, 6):
        if t < 181:
            x = (rad - f) * math.cos(t * pi / 180)
            y = (rad - f) * math.sin(t * pi / 180)
            out.append((x, y))
        else:
            if t > 270:
                t1 = ((t - 270) / 2 + 315)
                x = x1 + rad * math.cos(t1 * pi / 180)
                y = rad * math.sin(t1 * pi / 180)
                out.append((x, y))
            else:
                t1 = ((t - 270) / 2 + 225)
                x = x2 + rad * math.cos(t1 * pi / 180)
                y = rad * math.sin(t1 * pi / 180)
                out.append((x, y))
    s = math.sin(angle * pi / 180)
    c = math.cos(angle * pi / 180)
    return [(i*c - j*s + x0, i*s + j*c + y0) for i, j in out]

def trianglePoints(angle, x0, y0, f):
    rad = f * rt
    out = []
    x1 = -f
    for t in range(-45, 46, 6):
        x = x1 + rad * math.cos(t * pi / 180)
        y = rad * math.sin(t * pi / 180)
        out.append((x, y))
    out.append((-f, 0))
    out.append(out[0])
    s = math.sin(angle * pi / 180)
    c = math.cos(angle * pi / 180)
    return [(i*c - j*s + x0, i*s + j*c + y0) for i, j in out]

def eyePoints(angle, x0, y0, f):
    rad = f * rt
    out = []
    x1 = -f
    for t in range(-45, 46, 6):
        x = x1 + rad * math.cos(t * pi / 180)
        y = rad * math.sin(t * pi / 180)
        out.append((x, y))
    for t in range(135, 226, 6):
        x = -x1 + rad * math.cos(t * pi / 180)
        y = rad * math.sin(t * pi / 180)
        out.append((x, y))
    s = math.sin(angle * pi / 180)
    c = math.cos(angle * pi / 180)
    return [(i*c - j*s + x0, i*s + j*c + y0) for i, j in out]

def cornerPoints(angle, x0, y0, f):
    rad = f * rt
    out = []
    x1 = -f
    for t in range(0, 361, 6):
        if t < 91:
            x = (rad - f) * math.cos(t * pi / 180)
            y = (rad - f) * math.sin(t * pi / 180)
            out.append((x, y))
        else:
            if t > 269:
                t1 = ((t - 270) / 2 + 315)
                x = x1 + rad * math.cos(t1 * pi / 180)
                y = rad * math.sin(t1 * pi / 180)
                out.append((x, y))
            else:
                if t < 181:
                    t1 = ((t - 180) / 2 + 135)
                    x = rad * math.cos(t1 * pi / 180)
                    y = x1 + rad * math.sin(t1 * pi / 180)
                    out.append((x, y))
    s = math.sin(angle * pi / 180)
    c = math.cos(angle * pi / 180)
    return [(i*c - j*s + x0, i*s + j*c + y0) for i, j in out]


# ---------------- rotate helper for diamond ----------------
def rotate_points_about_center(points: List[Tuple[float, float]], angle_deg: float, center: Tuple[float, float]) -> List[Tuple[float, float]]:
    s = math.sin(math.radians(angle_deg))
    c = math.cos(math.radians(angle_deg))
    cx, cy = center
    out = []
    for (x, y) in points:
        tx = x - cx
        ty = y - cy
        rx = tx * c - ty * s
        ry = tx * s + ty * c
        out.append((rx + cx, ry + cy))
    return out

# -----------------------------------------------------
# Kolam cell drawing logic
# -----------------------------------------------------
def drawBox(row, col, top, bottom, left, right):
    numEdges = top + bottom + left + right
    if numEdges == 4:
        return sqPoints(col, row, 0.5)
    elif numEdges == 3:
        if right == 0: angle = 0
        elif left == 0: angle = 180
        elif top == 0: angle = 270
        else: angle = 90
        return trianglePoints(angle, col, row, 0.5)
    elif numEdges == 2:
        if top != bottom:
            if [top, right] == [1,1]:
                angle = 90
            elif [top, left] == [1,1]:
                angle = 0
            elif [bottom, left] == [1,1]:
                angle = 270
            else:
                angle = 180
            return cornerPoints(angle, col, row, 0.5)
        else:
            angle = 0 if top==1 else 90
            return eyePoints(angle, col, row, 0.5)
    elif numEdges == 1:
        if bottom==1: angle=180
        elif top==1: angle=0
        elif left==1: angle=270
        else: angle=90
        return loopPoints(angle, col, row, 0.5)
    else:
        return circlePoints(col, row, 0.5)


def edges_to_segments(k, allRows, allCols):
    segments = []
    for r in range(k):
        for c in range(k):
            top = allCols[c][r]
            bottom = allCols[c][r+1]
            left = allRows[r][c]
            right = allRows[r][c+1]
            segments.append(drawBox(r, c, top, bottom, left, right))
    return segments

def _rand_edge(m: float) -> int:
    if m <= 1.0:
        return 0
    # Probability of returning 0 is 1/m
    # If m=2, P(0)=0.5. If m=10, P(0)=0.1
    return 0 if np.random.random() < (1.0 / m) else 1


def randomKolam(m: int, k: int):
    allRows = []
    allCols = []
    for _ in range(k):
        rowEdges = []
        colEdges = []
        for j in range(k + 1):
            if j == 0 or j == k:
                active = 0
                rowEdges.append(active)
            else:
                active = _rand_edge(m)
                rowEdges.append(active)
                active = _rand_edge(m)
            colEdges.append(active)
        allRows.append(rowEdges)
        allCols.append(colEdges)
    return allRows, allCols


def sym180(m: int, k: int):
    allRows = []
    allCols = []
    half = k // 2
    for _ in range(half):
        rowEdges = []
        colEdges = []
        for j in range(k + 1):
            if j == 0 or j == k:
                active = 0
                rowEdges.append(active)
            else:
                active = _rand_edge(m)
                rowEdges.append(active)
                active = _rand_edge(m)
            colEdges.append(active)
        allRows.append(rowEdges)
        allCols.append(colEdges)
    if k % 2 == 1:
        rowEdges = [0]
        colEdges = [0]
        for _ in range(half):
            rowEdges.append(_rand_edge(m))
            colEdges.append(_rand_edge(m))
        r = list(reversed(rowEdges))
        c = list(reversed(colEdges))
        allRows.append(rowEdges + r)
        allCols.append(colEdges + c)
    for i in range(half):
        ind = half - i - 1
        allRows.append(list(reversed(allRows[ind])))
        allCols.append(list(reversed(allCols[ind])))
    return allRows, allCols


def sym90(m: int, k: int):
    allRows = []
    half = k // 2
    for _ in range(half):
        rowEdges = []
        for j in range(k + 1):
            if j == 0 or j == k:
                active = 0
            else:
                active = _rand_edge(m)
            rowEdges.append(active)
        allRows.append(rowEdges)
    if k % 2 == 1:
        rowEdges = [0]
        for _ in range(half):
            rowEdges.append(_rand_edge(m))
        r = list(reversed(rowEdges))
        allRows.append(rowEdges + r)
    for i in range(half):
        ind = half - i - 1
        allRows.append(list(reversed(allRows[ind])))
    allCols = list(reversed([row[:] for row in allRows]))
    return allRows, allCols


def diagBoth(m: int, k: int):
    allRows = []
    half = k // 2
    for _ in range(half):
        rowEdges = []
        for j in range(k + 1):
            if j == 0 or j == k:
                active = 0
            else:
                active = _rand_edge(m)
            rowEdges.append(active)
        allRows.append(rowEdges)
    if k % 2 == 1:
        rowEdges = [0]
        for _ in range(half):
            rowEdges.append(_rand_edge(m))
        r = list(reversed(rowEdges))
        allRows.append(rowEdges + r)
    for i in range(half):
        ind = half - i - 1
        allRows.append(list(reversed(allRows[ind])))
    allCols = [row[:] for row in allRows]
    return allRows, allCols


def diagLR(m: int, k: int, diagSym: int):
    allRows = []
    for _ in range(k):
        rowEdges = []
        for j in range(k + 1):
            if j == 0 or j == k:
                active = 0
            else:
                active = _rand_edge(m)
            rowEdges.append(active)
        allRows.append(rowEdges)
    allCols = [row[:] for row in allRows]
    if diagSym == 1:
        allCols = [list(reversed(row)) for row in reversed(allRows)]
    return allRows, allCols


def symXY(m: int, k: int, vertSym: int):
    allRows = []
    allCols = []
    col_half = math.ceil(k / 2)
    for _ in range(col_half):
        colEdges = []
        for j in range(k + 1):
            if j == 0 or j == k:
                active = 0
            else:
                active = _rand_edge(m)
            colEdges.append(active)
        allCols.append(colEdges)
    tempRows = []
    row_half = math.ceil((k + 1) / 2)
    for _ in range(k):
        rowEdges = []
        for j in range(row_half):
            if j == 0:
                active = 0
            else:
                active = _rand_edge(m)
            rowEdges.append(active)
        tempRows.append(rowEdges)
    for i in range(k):
        left = tempRows[i][:math.ceil(k / 2)]
        allRows.append(left + list(reversed(tempRows[i])))
    for i in range(col_half - 2, -1, -1):
        allCols.append(allCols[i])
    if vertSym == 0:
        temp = allCols
        allCols = allRows
        allRows = temp
    return allRows, allCols


def symBoth(m: int, k: int):
    allRows = []
    allCols = []
    row_half = math.ceil(k / 2)
    col_half = math.ceil((k + 1) / 2)
    tempRows = []
    tempCols = []
    for _ in range(row_half):
        rowEdges = []
        colEdges = []
        for j in range(col_half):
            if j == 0:
                activer = 0
                activec = 0
            else:
                activer = _rand_edge(m)
                activec = _rand_edge(m)
            rowEdges.append(activer)
            colEdges.append(activec)
        tempRows.append(rowEdges)
        tempCols.append(colEdges)
    for i in range(row_half):
        left = tempRows[i][:math.ceil(k / 2)]
        allRows.append(left + list(reversed(tempRows[i])))
        left_c = tempCols[i][:math.ceil(k / 2)]
        allCols.append(left_c + list(reversed(tempCols[i])))
    for i in range((k // 2) - 1, -1, -1):
        allCols.append(allCols[i])
        allRows.append(allRows[i])
    return allRows, allCols


def symRadial(m: int, k: int):
    allRows = []
    tempRows = []
    half_rows = math.ceil(k / 2)
    half_cols = math.ceil((k + 1) / 2)
    for _ in range(half_rows):
        rowEdges = []
        for j in range(half_cols):
            if j == 0:
                active = 0
            else:
                active = _rand_edge(m)
            rowEdges.append(active)
        tempRows.append(rowEdges)
    for i in range(half_rows):
        left = tempRows[i][:math.ceil(k / 2)]
        allRows.append(left + list(reversed(tempRows[i])))
    for i in range(k // 2):
        ind = (k // 2) - i - 1
        allRows.append(list(reversed(allRows[ind])))
    allCols = [row[:] for row in allRows]
    return allRows, allCols


SYMMETRY_MAP = {
    "radial": symRadial,
    "diagonal": diagBoth,
    "square": symBoth,
    "180 degree": sym180,
    "90 degree": sym90,
    "vertical": lambda m, k: symXY(m, k, 1),
    "horizontal": lambda m, k: symXY(m, k, 0),
    "diagonal up": lambda m, k: diagLR(m, k, 0),
    "diagonal down": lambda m, k: diagLR(m, k, 1),
    "random": randomKolam,
}


# -----------------------------------------------------
# Core: Build Combined Matrix M (k × k × 4)
# -----------------------------------------------------
def build_combined_matrix(allRows, allCols):
    k = len(allRows)
    M = np.zeros((k, k, 4), dtype=np.int8)
    for r in range(k):
        for c in range(k):
            top = int(allCols[c][r])
            bottom = int(allCols[c][r+1])
            left = int(allRows[r][c])
            right = int(allRows[r][c+1])
            M[r, c] = [top, bottom, left, right]
    return M


# ---------------- symmetric animation frames (center-out) ----------------
def make_animation_frames(k: int, allRows, allCols, layout: str = "Square grid (no rotate)", max_frames: int = 120,
                          curve_color: str = "#800000", dot_color: str = "#000000", metadata: dict = None) -> List[Image.Image]:
    """Return a list of PIL.Image frames showing a center-out symmetric build animation.

    Parameters mirror the Streamlit UI: `layout` may be "Diamond grid (rotate 45°)".
    """
    # Use global Agg backend
    # order cells by distance from center (tie-breaker deterministic)
    center = ((k-1)/2.0, (k-1)/2.0)
    order = []
    for r in range(k):
        for c in range(k):
            dist = (r - center[0])**2 + (c - center[1])**2
            order.append((dist, r, c, r*1000+c))
    order.sort(key=lambda x: (x[0], x[3]))
    ordered_cells = [(r,c) for (_,r,c,_) in order]

    total_cells = len(ordered_cells)
    if total_cells <= max_frames:
        steps = list(range(1, total_cells+1))
    else:
        sample_positions = np.linspace(1, total_cells, num=max_frames, dtype=int)
        steps = list(np.unique(sample_positions))
        if steps[-1] != total_cells:
            steps.append(total_cells)

    cell_shapes = [[drawBox(r, c, allCols[c][r], allCols[c][r+1], allRows[r][c], allRows[r][c+1])
                    for c in range(k)] for r in range(k)]

    frames: List[Image.Image] = []
    # Optimization: Reduced figsize and DPI for smaller GIF size
    if k <= 35:
        figsize = (4, 4); lw = 1.5
    elif k <= 80:
        figsize = (5, 5); lw = 1.0
    else:
        figsize = (6, 6); lw = 0.8

    do_rotate = (layout == "Diamond grid (rotate 45°)")
    angle_deg = 45.0 if do_rotate else 0.0
    center_point = ((k-1)/2.0, (k-1)/2.0)
    
    # --- Disjoint Component Coloring Logic for Animation ---
    # Optimized Coloring Logic
    cell_colors = {}
    if metadata and metadata.get('multi_color_palette'):
        try:
             colors_json = metadata.get('multi_color_palette')
             if isinstance(colors_json, str):
                 colors = json.loads(colors_json)
             else:
                 colors = colors_json
             
             # Local DSU
             parent = {}
             def find(i):
                 path = []
                 while parent[i] != i:
                     path.append(i)
                     i = parent[i]
                 for node in path: parent[node] = i
                 return i
             def union(i, j):
                 root_i = find(i); root_j = find(j)
                 if root_i != root_j: parent[root_i] = root_j
             
             for r in range(k):
                 for c in range(k): parent[(r,c)] = (r,c)
             for r in range(k):
                 for c in range(k-1):
                     if allRows[r][c+1] == 1: union((r,c), (r,c+1))
             for c in range(k):
                 for r in range(k-1):
                     if allCols[c][r+1] == 1: union((r,c), (r+1,c))
             
             # Components
             components = {}
             for r in range(k):
                 for c in range(k):
                     root = find((r,c))
                     if root not in components: components[root] = []
                     components[root].append((r,c))
                     
             # Sort Components
             root_info = []
             for root, pts in components.items():
                 cr = sum(x[0] for x in pts)/len(pts)
                 cc = sum(x[1] for x in pts)/len(pts)
                 center_dist = (cr - (k-1)/2.0)**2 + (cc - (k-1)/2.0)**2
                 root_info.append({'root': root, 'size': len(pts), 'dist': center_dist})
             root_info.sort(key=lambda x: (-x['size'], x['dist']))
             
             # Assign Component Colors
             comp_color_map = {}
             current_idx = 0
             if root_info:
                 first = root_info[0]
                 comp_color_map[first['root']] = colors[0]
                 last_size = first['size']; last_dist = first['dist']
                 for i in range(1, len(root_info)):
                     curr = root_info[i]
                     if curr['size'] == last_size and abs(curr['dist'] - last_dist) < 0.001:
                         comp_color_map[curr['root']] = colors[current_idx % len(colors)]
                     else:
                         current_idx += 1
                         comp_color_map[curr['root']] = colors[current_idx % len(colors)]
                         last_size = curr['size']; last_dist = curr['dist']
             
             # Map back to cells
             for r in range(k):
                 for c in range(k):
                     root = find((r,c))
                     cell_colors[(r,c)] = comp_color_map.get(root, curve_color)
             
             print(f"Animation: Found {len(components)} components, assigned {len(comp_color_map)} colors", flush=True)
             print(f"Animation: Color palette = {colors}", flush=True)
                     
        except Exception as e:
             print(f"Animation coloring error: {e}", flush=True)
             import traceback
             traceback.print_exc()

    for step in steps:
        fig = Figure(figsize=figsize)
        canvas = FigureCanvasAgg(fig)
        ax = fig.add_subplot(111)

        revealed = set(ordered_cells[:step])
        for (r,c) in revealed:
            pts = cell_shapes[r][c]
            if do_rotate:
                pts = rotate_points_about_center(pts, angle_deg, center_point)
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            
            # Use pre-calculated color
            c_col = cell_colors.get((r,c), curve_color)
            ax.plot(xs, ys, linewidth=lw, color=c_col)
        # dots
        marker_size = max(2, int(round(max(6, 20 - 1.5 * (k/1.0)))))
        if do_rotate:
            for i in range(k):
                for j in range(k):
                    px, py = rotate_points_about_center([(i,j)], angle_deg, center_point)[0]
                    ax.plot(px, py, '.', color=dot_color, markersize=marker_size)
        else:
            for i in range(k):
                for j in range(k):
                    ax.plot(i, j, '.', color=dot_color, markersize=marker_size)

        ax.set_aspect('equal'); ax.axis('off'); fig.tight_layout()
        buf = BytesIO()
        # Optimization: Reduced DPI from 120 to 72
        # fig.savefig(buf, format='png', dpi=72, bbox_inches='tight', pad_inches=0.02)
        fig.savefig(buf, format='png', dpi=72, bbox_inches='tight', pad_inches=0.02)
        # plt.close(fig) <-- No longer needed
        buf.seek(0)
        img = Image.open(buf).convert('RGBA')
        frames.append(img)
    return frames

def make_animation_gif_bytes(k: int, allRows, allCols, layout: str = "Square grid (no rotate)",
                             max_frames: int = 60, curve_color: str = "#800000", dot_color: str = "#000000",
                             duration_ms: int = 100, metadata: dict = None) -> bytes:
    """Return GIF bytes for the symmetric build animation."""
    # Optimization: Reduced default max_frames from 120 to 60 and duration from 160 to 100
    frames = make_animation_frames(k, allRows, allCols, layout=layout, max_frames=max_frames,
                                   curve_color=curve_color, dot_color=dot_color, metadata=metadata)
    if not frames:
        return b""
    gif_buf = BytesIO()
    frames[0].save(gif_buf, format='GIF', save_all=True, append_images=frames[1:], duration=duration_ms, loop=0, disposal=2)
    gif_buf.seek(0)
    return gif_buf.getvalue()


def render_preview_png_bytes(k: int, allRows, allCols, layout: str = "Square grid (no rotate)",
                            curve_color: str = "#800000", dot_color: str = "#000000", grid_color: str = None, dpi: int = 150,
                            metadata: dict = None) -> bytes:
    """Render a static kolam preview and return raw PNG bytes.
    
    If `metadata` is provided, it is embedded into the PNG using PIL PngInfo.
    """
    segments = edges_to_segments(k, allRows, allCols)
    # size heuristics from original UI
    if k <= 35:
        figsize = (6,6); lw = 1.6
    elif k <= 80:
        figsize = (8,8); lw = 1.1
    else:
        figsize = (10,10); lw = 0.9

    print(f"DEBUG: render_preview_png_bytes k={k}", flush=True)

    fig = Figure(figsize=figsize)
    canvas = FigureCanvasAgg(fig)
    ax = fig.add_subplot(111)
    
    print("DEBUG: Figure created", flush=True)
    do_rotate = (layout == "Diamond grid (rotate 45°)")
    center = ((k-1)/2.0, (k-1)/2.0)
    angle_deg = 45.0 if do_rotate else 0.0

    
    # --- Disjoint Component Coloring Logic ---
    segments_with_colors = []
    
    if hasattr(metadata, 'get') and metadata.get('multi_color_palette'):
        try:
            colors = metadata.get('multi_color_palette')
            if isinstance(colors, str):
                import json
                colors = json.loads(colors)
            if not colors:
                colors = [curve_color]
                
            # Disjoint Set Union (DSU) to find connected components of cells
            parent = {}
            def find(i):
                if parent[i] != i:
                    parent[i] = find(parent[i])
                return parent[i]
            def union(i, j):
                root_i = find(i); root_j = find(j)
                if root_i != root_j: parent[root_i] = root_j
                
            # Initialize DSU
            for r in range(k):
                for c in range(k):
                    parent[(r,c)] = (r,c)
            
            # Traverse Edges
            # Horizontal (left/right) connection:
            # allRows[r][c] is Left edge of (r,c)
            # allRows[r][c+1] is Right edge of (r,c) and Left edge of (r,c+1)
            # If allRows[r][c+1] == 1, then (r,c) is connected to (r,c+1)
            for r in range(k):
                for c in range(k-1):
                    if allRows[r][c+1] == 1:
                        union((r,c), (r,c+1))
                        
            # Vertical (top/bottom) connection:
            # allCols[c][r] is Top
            # allCols[c][r+1] is Bottom of (r,c) and Top of (r+1,c)
            for c in range(k):
                for r in range(k-1):
                    if allCols[c][r+1] == 1:
                        union((r,c), (r+1,c))
                        
            # Group by root
            components = {}
            for r in range(k):
                for c in range(k):
                    root = find((r,c))
                    if root not in components: components[root] = []
                    components[root].append((r,c))
            
            # Assign colors
            # Heuristic for symmetry: sort roots by distance from center of their first cell (or centroid)
            # Sort roots by distance from center of their centroid
            # Group structurally symmetric parts (same size, same distance) together
            root_info = []
            for root, pts in components.items():
                cr = sum(x[0] for x in pts)/len(pts)
                cc = sum(x[1] for x in pts)/len(pts)
                center_dist = (cr - (k-1)/2.0)**2 + (cc - (k-1)/2.0)**2
                root_info.append({
                    'root': root,
                    'size': len(pts),
                    'dist': center_dist
                })
            
            # Sort by size (desc) then distance (asc)
            # This generally puts the big main loops first, or the center loops first
            root_info.sort(key=lambda x: (-x['size'], x['dist']))
            
            # Assign colors based on groups
            # We treat items as "same group" if size is identical and distance is very close
            root_color_map = {}
            current_group_idx = 0
            if root_info:
                # Initialize first
                first = root_info[0]
                root_color_map[first['root']] = colors[0]
                last_size = first['size']
                last_dist = first['dist']
                
                for i in range(1, len(root_info)):
                    curr = root_info[i]
                    # Tolerance for float comparison
                    if curr['size'] == last_size and abs(curr['dist'] - last_dist) < 0.001:
                        # Same group, same color
                        root_color_map[curr['root']] = colors[current_group_idx % len(colors)]
                    else:
                        # New group
                        current_group_idx += 1
                        root_color_map[curr['root']] = colors[current_group_idx % len(colors)]
                        last_size = curr['size']
                        last_dist = curr['dist']
                
            # Generate segments with assigned colors
            for r in range(k):
                for c in range(k):
                    seg = drawBox(r, c, allCols[c][r], allCols[c][r+1], allRows[r][c], allRows[r][c+1])
                     # Find color
                    root = find((r,c))
                    col = root_color_map.get(root, curve_color)
                    segments_with_colors.append((seg, col))
            
            print(f"Static: Found {len(components)} components, assigned {len(root_color_map)} colors", flush=True)
            print(f"Static: Color palette = {colors}", flush=True)
                    
        except Exception as e:
            print(f"Coloring failed: {e}", flush=True)
            import traceback
            traceback.print_exc()
            segments_with_colors = [(s, curve_color) for s in segments]
    else:
        segments_with_colors = [(s, curve_color) for s in segments]

    for seg, color in segments_with_colors:
        pts = seg
        if do_rotate:
            pts = rotate_points_about_center(pts, angle_deg, center)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        ax.plot(xs, ys, linewidth=lw, color=color)
    marker_size = max(4, int(18 - 1.5 * k))
    if do_rotate:
        for i in range(k):
            for j in range(k):
                px, py = rotate_points_about_center([(j, i)], angle_deg, center)[0]
                ax.plot(px, py, '.', color=dot_color, markersize=marker_size)
        if grid_color:
             # Draw rotated grid lines
             # Horizontal lines (j varies, i constant)
             for i in range(k):
                 pts = [(j, i) for j in range(k)]
                 rot_pts = rotate_points_about_center(pts, angle_deg, center)
                 xs = [p[0] for p in rot_pts]; ys = [p[1] for p in rot_pts]
                 ax.plot(xs, ys, color=grid_color, linewidth=0.5, alpha=0.5)
             # Vertical lines (i varies, j constant)
             for j in range(k):
                 pts = [(j, i) for i in range(k)]
                 rot_pts = rotate_points_about_center(pts, angle_deg, center)
                 xs = [p[0] for p in rot_pts]; ys = [p[1] for p in rot_pts]
                 ax.plot(xs, ys, color=grid_color, linewidth=0.5, alpha=0.5)
    else:
        for i in range(k):
            for j in range(k):
                ax.plot(j, i, '.', color=dot_color, markersize=marker_size)
        if grid_color:
            # Draw standard grid
            for i in range(k):
                ax.plot([0, k-1], [i, i], color=grid_color, linewidth=0.5, alpha=0.5)
            for j in range(k):
                ax.plot([j, j], [0, k-1], color=grid_color, linewidth=0.5, alpha=0.5)

    ax.set_aspect('equal'); ax.axis('off'); fig.tight_layout()
    
    # First save to buffer via matplotlib
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight', pad_inches=0.02)
    # plt.close(fig)
    buf.seek(0)
    
    # If metadata is present, use PIL to embed it
    if metadata:
        try:
            from PIL import Image, PngImagePlugin
            img = Image.open(buf)
            png_info = PngImagePlugin.PngInfo()
            for k_str, v_str in metadata.items():
                png_info.add_text(k_str, str(v_str))
            
            out_buf = BytesIO()
            img.save(out_buf, format="PNG", pnginfo=png_info)
            out_buf.seek(0)
            return out_buf.getvalue()
        except Exception as e:
            print(f"Metadata embedding failed: {e}")
            return buf.getvalue()
            
    return buf.getvalue()


# -----------------------------------------------------
# Primary generate function for backend
# -----------------------------------------------------
def generate_kolam(symmetry, m, k, seed=0, layout: str = "Square grid (no rotate)",
                   curve_color: str = "#800000", dot_color: str = "#000000", grid_color: str = None,
                   analyze: bool = False, return_preview: bool = True, metadata: dict = None):
    """Generate a kolam.

    Parameters:
    - symmetry, m, k, seed, layout, curve_color, dot_color: same as before.
    - analyze: when True, include analysis artifacts (allRows, allCols, segments_payload, img_base64).
      When False, only the combined matrix `M` is guaranteed; analysis outputs will be None.
    - return_preview: when True, a PNG preview (bytes) is returned (useful for quick preview/downloads).
    - metadata: optional dict to embed in the PNG preview.

    Return (in a backwards-compatible tuple):
      (M, allRows_or_None, allCols_or_None, segments_payload_or_None, img_base64_or_empty, png_bytes_or_None)

    Note: callers that only need the combined matrix should call with analyze=False to avoid
    constructing potentially large analysis payloads for downstream UI/analysis.
    """
    if k <= 0:
        raise ValueError("Grid size 'k' must be positive")

    if seed != 0:
        np.random.seed(int(seed))
    else:
        np.random.seed(None)

    builder = SYMMETRY_MAP.get(str(symmetry).lower(), randomKolam)
    allRows, allCols = builder(m, k)

    # combined matrix (k x k x 4) -- always produced
    M = build_combined_matrix(allRows, allCols)

    # prepare optional analysis outputs only if requested
    segments_payload = None
    img_base64 = ''
    png_bytes = None
    if analyze:
        segments = edges_to_segments(k, allRows, allCols)
        segments_payload = []
        for seg in segments:
            segments_payload.append([[float(x), float(y)] for x, y in seg])
        if return_preview:
            png_bytes = render_preview_png_bytes(k, allRows, allCols, layout=layout,
                                                 curve_color=curve_color, dot_color=dot_color, grid_color=grid_color, metadata=metadata)
            img_base64 = base64.b64encode(png_bytes).decode('utf-8') if png_bytes else ''
    else:
        # still optionally produce a lightweight preview if requested
        if return_preview:
            png_bytes = render_preview_png_bytes(k, allRows, allCols, layout=layout,
                                                 curve_color=curve_color, dot_color=dot_color, grid_color=grid_color, metadata=metadata)
            img_base64 = base64.b64encode(png_bytes).decode('utf-8') if png_bytes else ''

    # Backwards-compatible return order. When analyze=False some fields are None/empty.
    return M, (allRows if analyze else None), (allCols if analyze else None), segments_payload, img_base64, png_bytes


def generate_from_model(model_path="kolam_vae.pth", latent_vector=None, k=15):
    """Generate a Kolam using the trained VAE model."""
    if torch is None or KolamVAE is None:
        raise ImportError("Torch or Model not found")
    
    # Load model
    model = KolamVAE(k=k, latent_dim=32)
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu'), weights_only=True)) # nosec B614
    else:
        # If path not found, try looking in same dir
        cur_dir = os.path.dirname(os.path.abspath(__file__))
        path2 = os.path.join(cur_dir, model_path)
        if os.path.exists(path2):
            model.load_state_dict(torch.load(path2, map_location=torch.device('cpu'), weights_only=True)) # nosec B614
        else:
            raise FileNotFoundError(f"Model not found at {model_path}")
            
    model.eval()
    
    if latent_vector is None:
        # Sample random latent
        z = torch.randn(1, 32)
    else:
        z = torch.tensor(latent_vector).float().view(1, 32)
        
    with torch.no_grad():
        # Decode
        decoded_flat = model.decoder_input(z)
        decoded_reshaped = decoded_flat.view(-1, 128, 4, 4)
        output = model.decoder(decoded_reshaped)
        
        # Crop to KxK (same as in model.forward)
        output = output[:, :, :k, :k]
        
        # Output is (1, 4, K, K) probabilities
        
        # Threshold to binary
        M_probs = output.squeeze(0).permute(1, 2, 0).numpy() # (K, K, 4)
        M = (M_probs > 0.5).astype(np.int8)
        
    # Reconstruct allRows, allCols from M
    allRows = []
    allCols = []
    
    # Construct allRows (horizontal edges)
    for r in range(k):
        row_edges = []
        for c in range(k+1):
            if c == 0:
                val = M[r, 0, 2] # Left of first cell
            elif c == k:
                val = M[r, k-1, 3] # Right of last cell
            else:
                # Use Right of previous cell as primary source
                val = M[r, c-1, 3]
            row_edges.append(int(val))
        allRows.append(row_edges)
        
    # Construct allCols (vertical edges)
    for c in range(k):
        col_edges = []
        for r in range(k+1):
            if r == 0:
                val = M[0, c, 0] # Top of first cell
            elif r == k:
                val = M[k-1, c, 1] # Bottom of last cell
            else:
                # Use Bottom of previous cell
                val = M[r-1, c, 1]
            col_edges.append(int(val))
        allCols.append(col_edges)
        
    return M, allRows, allCols
