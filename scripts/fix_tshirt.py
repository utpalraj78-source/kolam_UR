import os
import math
import random

def ensure_dir(file_path):
    directory = os.path.dirname(file_path)
    if not os.path.exists(directory):
        os.makedirs(directory)

def write_obj(filename, vertices, faces, uvs=None):
    ensure_dir(filename)
    with open(filename, 'w') as f:
        f.write("# Generated Model\n")
        f.write("g Mesh\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        
        # Simple UVs if provided
        if uvs:
            for uv in uvs:
                 f.write(f"vt {uv[0]:.6f} {uv[1]:.6f}\n")

        for face in faces:
            # OBJ indices are 1-based
            f.write("f")
            for i, idx in enumerate(face):
                if uvs:
                    # v/vt
                    f.write(f" {idx+1}/{idx+1}")
                else:
                    f.write(f" {idx+1}")
            f.write("\n")
    print(f"Saved {filename}")

def simple_tshirt():
    # A cleaner, more predictable topology for a "Flat Lay" T-Shirt
    # Modeled as a T-shaped plane with thickness and smoothed corners
    
    vertices = []
    uvs = []
    faces = []
    
    # Grid logic
    # We create a 2D signed distance field or implicit shape for T-shirt
    # Then meshing it with a grid
    
    # Dimensions
    width_body = 50
    height_body = 70
    width_sleeve = 20
    height_sleeve = 25
    
    res = 2.0 # cm per vertex
    
    # 2D Grid
    cols = int(140 / res)
    rows = int(100 / res)
    
    # Center 0,0
    
    # SDF Function for T-Shirt Shape
    def sdf_tshirt(x, y):
        # Body Box
        dx_b = abs(x) - width_body/2
        dy_b = abs(y - 5) - height_body/2 # Shift y slightly
        dist_body = max(dx_b, dy_b)
        
        # Sleeve Boxes (Angled?)
        # Simple: straight out for flat lay
        # Center of sleeve: y approx +25
        sleeve_y = 25
        dx_s = abs(x) - (width_body/2 + width_sleeve/2)
        dy_s = abs(y - sleeve_y) - height_sleeve/2
        
        # We union body and sleeves
        # But we want smooth union
        
        # Let's just do explicit grid generation for topology quality
        return min(dist_body, 0) # Placeholder
        
    # Better: Parametric Surface
    # 1. Torso Rect
    # 2. Add Sleeves
    # 3. Add Neck
    
    # Let's simple create a dense grid and scale points to shape
    grid_w = 40
    grid_h = 50
    
    for i in range(grid_h):
        y_pct = i / (grid_h - 1) # 0 to 1 (Bottom to Top)
        
        for j in range(grid_w):
            x_pct = j / (grid_w - 1) # 0 to 1 (Left to Right)
            x_centered = (x_pct - 0.5) * 2 # -1 to 1
            
            # Base width
            w_current = 0.6
            
            # Shoulders (top 20%)
            if y_pct > 0.8:
                w_current = 0.8
            
            # Sleeves logic
            is_sleeve = False
            if y_pct > 0.75 and abs(x_centered) > 0.5:
                # Sleeve area
                pass
                
    # OK, Manual Vertex Definition for "Low Poly Authenticity" but subdivided
    # We define the BOUNDARY and fill it.
    
    # Boundary Points (half)
    # Start Bottom Center (0, -0.8)
    boundary = []
    boundary.append((0, -0.8))
    boundary.append((0.55, -0.8)) # Bot Right
    boundary.append((0.53, 0.4)) # Armpit inner
    boundary.append((0.85, 0.3)) # Sleeve outer bot
    boundary.append((0.9, 0.55)) # Sleeve outer top
    boundary.append((0.6, 0.65)) # Shoulder
    boundary.append((0.2, 0.68)) # Neck right
    boundary.append((0, 0.55)) # Neck center low
    
    # Mirrored
    full_boundary = []
    # Right side
    full_boundary.extend(boundary)
    # Left side (reverse boundary reversed)
    for px, py in reversed(boundary[1:-1]): # Skip first (0,-0.8) and last (0,0.55) to avoid double center?
        # Neck center low is at 0, 0.55. Bottom center at 0, -0.8.
        # We need to close loop properly.
        full_boundary.append((-px, py))
        
    # Triangulate? 
    # For "Realistic", we want smooth curves.
    # We can use a Cloth Simulation logic: A grid of springs relaxed into shape.
    # Too complex.
    
    # Let's build a "Pillow" Mesh.
    # A grid deformed to the T-shirt mask.
    
    mask_w, mask_h = 100, 100
    points = []
    valid_indices = {} # map (r,c) to vertex index
    
    scale_x = 2.0
    scale_y = 2.0
    
    # Noise for wrinkles
    def noise(x, y):
        return math.sin(x * 10) * 0.01 + math.cos(y * 8) * 0.01
    
    for r in range(mask_h):
        y = (r / mask_h - 0.5) * scale_y
        for c in range(mask_w):
            x = (c / mask_w - 0.5) * scale_x
            
            # SDF Logic
            # Torso: |x| < 0.55, |y| < 0.8
            in_torso = abs(x) < 0.55 and y > -0.8 and y < 0.68
            
            # Sleeve: y approx 0.4 to 0.65?
            # angled line eq?
            # Let's simplify: Sleeves are boxes attached.
            in_sleeve = False
            if y > 0.3 and y < 0.65:
                if abs(x) < 0.9: in_sleeve = True
                
            # Neck cutout
            in_neck = False
            if y > 0.55 and abs(x) < 0.2:
                in_neck = True # This is emptiness
                
            # Refine shape
            t_val = 1.0 # Inside
            
            # Smooth Neck: Circle at (0, 0.7) rad 0.25
            if (x*x + (y-0.7)*(y-0.7)) < 0.04: in_neck = True
            
            # Shoulders rounding
            
            if (in_torso or in_sleeve) and not in_neck:
                # Add vertex
                # Z height based on distance to edge (pillow effect)
                
                # Simple height map:
                z = 0.1 # thickening
                # Taper edges
                d_edge = 0.1
                # Recalculate exact distance to boundary is hard.
                # Fake it:
                # If near sleeve end or bottom, reduce z
                
                # Wrinkles
                z += noise(x,y)
                
                valid_indices[(r,c)] = len(vertices)
                vertices.append((x, y, z))
                uvs.append(((x/scale_x + 0.5), (y/scale_y + 0.5)))
                
    # Create Back faces (mirror Z) - or just simple single layer with thickness?
    # Double layer is best for "Cloth" look.
    
    n_front = len(vertices)
    # Back vertices
    for i in range(n_front):
        vx, vy, vz = vertices[i]
        vertices.append((vx, vy, -0.05)) # Flat back
        uvs.append(uvs[i])
        
    # Faces
    # Front
    for r in range(mask_h - 1):
        for c in range(mask_w - 1):
            p1 = valid_indices.get((r, c))
            p2 = valid_indices.get((r, c+1))
            p3 = valid_indices.get((r+1, c+1))
            p4 = valid_indices.get((r+1, c))
            
            if p1 is not None and p2 is not None and p3 is not None and p4 is not None:
                faces.append([p1, p2, p3, p4])
                
    # Back
    for r in range(mask_h - 1):
        for c in range(mask_w - 1):
            p1 = valid_indices.get((r, c)) # + n_front
            p2 = valid_indices.get((r, c+1))
            p3 = valid_indices.get((r+1, c+1))
            p4 = valid_indices.get((r+1, c))
            
            if p1 is not None and p2 is not None and p3 is not None and p4 is not None:
                # Reverse winding
                faces.append([p1+n_front, p4+n_front, p3+n_front, p2+n_front])

    # Stitch Edges (Thickness)
    # Iterate all cells, if neighbor is missing, it's an edge
    for r in range(mask_h):
        for c in range(mask_w):
            curr = valid_indices.get((r,c))
            if curr is None: continue
            
            # 4 neighbors
            neighbors = [
                (r+1, c), (r-1, c), (r, c+1), (r, c-1)
            ]
            
            for nr, nc in neighbors:
                if valid_indices.get((nr, nc)) is None:
                    # Edge found
                    # Create quad between Front(curr) and Back(curr+n_front)
                    # But we need continuous strip... this point-wise approach is messy for quads.
                    pass
    
    # Let's rely on high density front/back.
    # To fix "Cooked" look: High resolution + UVs + Noise = Fabric look.
    
    write_obj('public/models/tshirt.obj', vertices, faces, uvs)

if __name__ == "__main__":
    simple_tshirt()
    # Phone stays, generated in prev step and was likely fine (box with rounded corners)
    print("Regenerated High-Res T-Shirt.")
