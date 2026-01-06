import os
import math

def ensure_dir(file_path):
    directory = os.path.dirname(file_path)
    if not os.path.exists(directory):
        os.makedirs(directory)

def write_obj(filename, vertices, faces):
    ensure_dir(filename)
    with open(filename, 'w') as f:
        f.write("# Generated Model\n")
        f.write("g Mesh\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        
        # Simple UV mapping: Planar X/Y (or X/Z for shirt front)
        # We will add simple UVs based on X,Y for T-shirt front
        # For OBJ, we need to declare texture coords (vt) and then reference them in faces.
        # Let's keep it simple: No explicit UVs in OBJ, but we can rely on Triplanar or standard decal projection in Three.js
        # Actually Decal in three.js calculates UVs based on projection.
        # But 'meshStandardMaterial' needs UVs if we map a texture. 
        # But we are using Decal, so base mesh UVs are not critical for the logo.
        
        for face in faces:
            # OBJ indices are 1-based
            f.write("f")
            for idx in face:
                f.write(f" {idx+1}")
            f.write("\n")
    print(f"Saved {filename}")

def generate_tshirt_realistic():
    vertices = []
    faces = []
    
    # We will build layers (from bottom to top) using a parametric ellipse shape
    # that deforms to create shoulders and sleeves.
    
    rows = 40  # Vertical resolution
    cols = 40  # Radial resolution
    
    height = 1.0
    half_h = height/2
    waist_width = 0.55
    shoulder_width = 0.65
    depth = 0.25
    
    # Helper to add quad
    def add_quad(r1, c1, r2, c2):
        base = len(faces)
        idx1 = r1 * cols + (c1 % cols)
        idx2 = r1 * cols + (c2 % cols)
        idx3 = r2 * cols + (c2 % cols)
        idx4 = r2 * cols + (c1 % cols)
        # OBJ CCW winding
        faces.append([idx1, idx2, idx3, idx4])

    for i in range(rows):
        v = i / (rows - 1) # 0 to 1 (Bottom to Top)
        y = (v * height) - (height * 0.4) # Shift down
        
        # Shaping functions
        # Width: Flared at bottom, slight taper waist, wide shoulders
        width = waist_width
        if v < 0.2: # Bottom flare
            width += (0.2 - v) * 0.1
        if v > 0.7: # Shoulders
             width += (v - 0.7) * 0.5
        
        # Depth: Taper at top
        current_depth = depth
        if v > 0.8:
            current_depth *= 0.8
        
        for j in range(cols):
            u = j / cols # 0 to 1 around
            angle = u * 2 * math.pi
            
            # Basic Ellipse
            x = math.cos(angle) * (width / 2)
            z = math.sin(angle) * (current_depth / 2)
            
            # Modify for Sleeves
            # Sleeves stick out at sides (around angle 0 and PI) near top
            if v > 0.75:
                # Local angle relative to side (-PI/2 to PI/2?)
                # Side 1: u=0 (cos=1). Side 2: u=0.5 (cos=-1)
                
                # Sleeve 1 (Right)
                dist_right = min(abs(u - 0.0), abs(u - 1.0))
                if dist_right < 0.15:
                    # Bulge out for sleeve
                    bulge = math.cos(dist_right * 10) # rough bell curve
                    x += bulge * 0.3 * (v - 0.75)/0.25
                    y -= bulge * 0.1 * (v - 0.75)/0.25 # Sleeves droop slightly
            
                # Sleeve 2 (Left)
                dist_left = abs(u - 0.5)
                if dist_left < 0.15:
                    bulge = math.cos(dist_left * 10)
                    x -= bulge * 0.3 * (v - 0.75)/0.25
                    y -= bulge * 0.1 * (v - 0.75)/0.25

            # Neck hole at very top
            if v > 0.95:
                # Pull in x to create neck curvature
                 pass # Simple tube for now

            vertices.append((x, y, z))
            
    # Generate faces for the tube
    for r in range(rows - 1):
        for c in range(cols):
            add_quad(r, c, r+1, c+1)
            
    # Cap the top (Shoulders/Neck) - simplified just leave open or stitch
    # We leave open for now as "neck hole" unless we want solid
    
    write_obj('public/models/tshirt.obj', vertices, faces)

def generate_phone_realistic():
    # iPhone-like rounded box with camera bump
    vertices = []
    faces = []
    
    w = 0.75
    h = 1.5
    d = 0.08
    corner_rad = 0.1
    segs = 12 # Corner smoothness
    
    # We extrude a rounded rect profile
    
    # 2D Profile (Bottom Left start, CW)
    profile = []
    
    # Helper for corner arc
    def add_corner(cx, cy, start_ang):
        for i in range(segs+1):
            ang = start_ang + (i/segs)*(math.pi/2)
            px = cx + corner_rad * math.cos(ang)
            py = cy + corner_rad * math.sin(ang)
            profile.append((px, py))

    # BR, TR, TL, BL
    add_corner(w/2 - corner_rad, -h/2 + corner_rad, -math.pi/2) # BR (270 to 360)
    add_corner(w/2 - corner_rad, h/2 - corner_rad, 0) # TR (0 to 90)
    add_corner(-w/2 + corner_rad, h/2 - corner_rad, math.pi/2) # TL (90 to 180)
    add_corner(-w/2 + corner_rad, -h/2 + corner_rad, math.pi) # BL (180 to 270)
    
    # Extrude
    # Front Face (z = d/2)
    # Back Face (z = -d/2)
    
    # Sides
    top_verts_start = 0
    bot_verts_start = len(profile)
    
    for px, py in profile:
        vertices.append((px, py, d/2)) # Top
    for px, py in profile:
        vertices.append((px, py, -d/2)) # Bot
        
    # Side Faces
    n = len(profile)
    for i in range(n):
        next_i = (i + 1) % n
        # Top edge i -> next_i
        # Bot edge i -> next_i
        # Quad: T_i, T_ni, B_ni, B_i
        idx1 = i
        idx2 = next_i
        idx3 = bot_verts_start + next_i
        idx4 = bot_verts_start + i
        faces.append([idx1, idx4, idx3, idx2])
        
    # Cap Front and Back
    # Simple N-gon (or triangulation fan)
    # Front
    front_face = [i for i in range(n)]
    faces.append(front_face)
    # Back
    back_face = [bot_verts_start + i for i in range(n)]
    back_face.reverse()
    faces.append(back_face)
    
    # Add Camera Bump on Back
    # Position: Top Left Back
    # rounded square
    # Simply add a separate box geometry to vertices?
    # Vertices are just a list.
    
    cam_w = 0.3
    cam_h = 0.3
    cam_d = 0.02
    cam_cx = -w/2 + 0.2
    cam_cy = h/2 - 0.2
    cam_z = -d/2 - cam_d/2 # Sticky out back
    
    base_idx = len(vertices)
    # Simple box for camera
    cv = [
        (cam_cx-cam_w/2, cam_cy-cam_h/2, cam_z-cam_d/2), (cam_cx+cam_w/2, cam_cy-cam_h/2, cam_z-cam_d/2), (cam_cx+cam_w/2, cam_cy+cam_h/2, cam_z-cam_d/2), (cam_cx-cam_w/2, cam_cy+cam_h/2, cam_z-cam_d/2), # Cam Face
        (cam_cx-cam_w/2, cam_cy-cam_h/2, -d/2), (cam_cx+cam_w/2, cam_cy-cam_h/2, -d/2), (cam_cx+cam_w/2, cam_cy+cam_h/2, -d/2), (cam_cx-cam_w/2, cam_cy+cam_h/2, -d/2) # Interface
    ]
    vertices.extend(cv)
    faces.append([base_idx+0, base_idx+1, base_idx+2, base_idx+3]) # Outer face
    # sides
    faces.append([base_idx+0, base_idx+4, base_idx+5, base_idx+1])
    faces.append([base_idx+1, base_idx+5, base_idx+6, base_idx+2])
    faces.append([base_idx+2, base_idx+6, base_idx+7, base_idx+3])
    faces.append([base_idx+3, base_idx+7, base_idx+4, base_idx+0])
    
    write_obj('public/models/phone.obj', vertices, faces)

if __name__ == "__main__":
    generate_tshirt_realistic()
    generate_phone_realistic()
    # Mug stays same (it was ok)
    print("Regenerated realistic T-shirt and Phone.")
