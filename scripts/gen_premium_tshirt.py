import math
import os

def ensure_dir(filename):
    os.makedirs(os.path.dirname(filename), exist_ok=True)

def write_obj(filename, vertices, faces, uvs):
    ensure_dir(filename)
    with open(filename, 'w') as f:
        f.write("# High Fidelity T-Shirt\n")
        f.write("g TShirt\n")
        
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
            
        for uv in uvs:
            f.write(f"vt {uv[0]:.6f} {uv[1]:.6f}\n")
            
        f.write("vn 0.0 1.0 0.0\n") # Dummy normal
        
        for face in faces:
            # Face format: v/vt
            row = "f"
            for idx in face:
                # 1-based index
                row += f" {idx+1}/{idx+1}"
            f.write(row + "\n")
    print(f"Generated {filename}")

def generate_premium_tshirt():
    # Model parameters
    waist_rad = 0.5
    chest_rad = 0.55
    shoulder_rad = 0.6
    
    total_height = 1.4
    armpit_height = 1.0
    shoulder_height = 1.35
    neck_height = 1.4
    
    torso_rings = 20
    radial_segs = 32 # Circumference resolution
    
    vertices = []
    uvs = []
    faces = []
    
    # Helper to add vertex
    def add_vert(x, y, z, u, v):
        vertices.append((x,y,z))
        uvs.append((u,v))
        return len(vertices) - 1
        
    # --- Generate Torso (Waist to Armpits) ---
    # We treat it as a flattened cylinder
    
    grid = [] # Store indices [ring][seg]
    
    for r in range(torso_rings + 1):
        v_pct = r / torso_rings
        y = v_pct * armpit_height
        
        # Profile shaping
        current_rad_x = waist_rad + (chest_rad - waist_rad) * (v_pct**0.5)
        current_rad_z = (waist_rad * 0.5) + ((chest_rad * 0.5) - (waist_rad * 0.5)) * v_pct
        
        # Add slight noise/fold? No, clean first.
        
        ring_indices = []
        for s in range(radial_segs):
            u_pct = s / radial_segs
            angle = u_pct * 2 * math.pi
            
            x = math.cos(angle) * current_rad_x
            z = math.sin(angle) * current_rad_z
            
            # Flatten back slightly?
            
            idx = add_vert(x, y, z, u_pct, v_pct * 0.7) # UV y scaled to leave room for shoulders
            ring_indices.append(idx)
        
        # Close loop for convenience if needed, but we used modulo in faces
        grid.append(ring_indices)
        
    # Faces for Torso
    for r in range(torso_rings):
        for s in range(radial_segs):
            s_next = (s + 1) % radial_segs
            
            idx1 = grid[r][s]
            idx2 = grid[r][s_next]
            idx3 = grid[r+1][s_next]
            idx4 = grid[r+1][s]
            
            faces.append([idx1, idx2, idx3, idx4])
            
    # --- Generate Shoulders & Neck ---
    # This is tricky without bifurcation.
    # We will "Loft" the armpit ring into a shape that includes start of arms and neck.
    
    # Let's simplify: Continue the cylinder but deform it into a "rounded rectangle" cross section
    # Then cap it with a neck hole.
    # And extrude arms separately from the side.
    
    last_ring = grid[-1]
    
    # Upper Body (Armpit to Shoulder Top)
    upper_rings = 8
    upper_grid = [last_ring]
    
    for r in range(1, upper_rings + 1):
        v_pct = r / upper_rings
        y = armpit_height + v_pct * (shoulder_height - armpit_height)
        
        # Transition from Circle to "Stadium" shape (wide X, flat Z)
        # At shoulder top, width is max
        
        current_rad_x = chest_rad + (shoulder_rad - chest_rad) * v_pct * 1.5
        current_rad_z = (chest_rad * 0.5) * (1.0 - v_pct * 0.5) # Thinner at shoulders
        
        ring_indices = []
        for s in range(radial_segs):
            u_pct = s / radial_segs
            # Modify angle distribution to concentrate points at sides (arms)?
            angle = u_pct * 2 * math.pi
            
            x = math.cos(angle) * current_rad_x
            z = math.sin(angle) * current_rad_z
            
            # Pull in center ("Neck area")? No, keeping it hull.
            
            idx = add_vert(x, y, z, u_pct, 0.7 + v_pct * 0.2)
            ring_indices.append(idx)
        upper_grid.append(ring_indices)
        
    # Faces Upper
    for r in range(upper_rings):
        for s in range(radial_segs):
            s_next = (s + 1) % radial_segs
            idx1 = upper_grid[r][s]
            idx2 = upper_grid[r][s_next]
            idx3 = upper_grid[r+1][s_next]
            idx4 = upper_grid[r+1][s]
            faces.append([idx1, idx2, idx3, idx4])

    # --- Sleeves ---
    # Identify "Side" vertices of the upper body and extrude out.
    # Sides are at angle 0 (Right) and PI (Left).
    # Cos(0)=1, Cos(PI)=-1.
    # Indices around 0 and radial_segs/2
    
    # Let's add separate Cylinder Meshes for Arms, intersecting the body ("Doll joint" style)
    # It looks cleaner than bad topology bifurcation.
    
    def generate_sleeve(side_sign):
        # side_sign: 1 for Right, -1 for Left
        
        sleeve_len = 0.4
        sleeve_rad = 0.22
        sleeve_rings = 8
        sleeve_segs = 16
        
        # Start position: Shoulder side
        start_x = (shoulder_rad * 0.8) * side_sign
        start_y = shoulder_height - 0.1
        start_z = 0
        
        # Angle down
        angle_down = 30 * (math.pi / 180) 
        
        sleeve_grid = []
        for r in range(sleeve_rings + 1):
            t = r / sleeve_rings
            # Axis direction
            axis_x = math.cos(angle_down) * side_sign
            axis_y = -math.sin(angle_down)
            
            cx = start_x + axis_x * t * sleeve_len
            cy = start_y + axis_y * t * sleeve_len
            cz = start_z
            
            ring = []
            for s in range(sleeve_segs):
                u = s / sleeve_segs
                ang = u * 2 * math.pi
                
                # Circle perpendicular to axis
                # Normal to axis?
                # Axis is (cos, -sin, 0) in XY plane.
                # Perpendicular vectors: (sin, cos, 0) and (0,0,1)
                
                local_u = math.cos(ang) * sleeve_rad
                local_v = math.sin(ang) * sleeve_rad
                
                # Rotate local_u, local_v to align with axis
                # Z is unchanged (local_v -> Z)
                # local_u is along the perpendicular in XY plane
                
                px = cx + local_u * math.sin(angle_down) * side_sign # Rotated 90?
                py = cy + local_u * math.cos(angle_down) # 
                pz = cz + local_v
                
                # Fix rotation math roughly:
                # Basic cylinder x,z rotated around z axis. Since arm is in XY plane.
                # Ring plane is normal to arm axis.
                
                perp_x = -axis_y # sin
                perp_y = axis_x  # cos
                
                dx = perp_x * math.cos(ang) * sleeve_rad
                dy = perp_y * math.cos(ang) * sleeve_rad
                dz = math.sin(ang) * sleeve_rad
                
                fx = cx + dx
                fy = cy + dy
                fz = cz + dz
                
                # UVs: map to a corner of texture
                uv_u = 0.5 + (0.1 * side_sign) # messy
                uv_v = 0.5
                
                idx = add_vert(fx, fy, fz, uv_u, uv_v)
                ring.append(idx)
            sleeve_grid.append(ring)
            
        # Faces
        for r in range(sleeve_rings):
            for s in range(sleeve_segs):
                sn = (s+1)%sleeve_segs
                faces.append([sleeve_grid[r][s], sleeve_grid[r][sn], sleeve_grid[r+1][sn], sleeve_grid[r+1][s]])

    generate_sleeve(1)
    generate_sleeve(-1)
    
    # --- Neck ---
    # Top of the upper_grid is simply open.
    # We can create a "Neck Collar" torus there.
    # Simply cap with an inner ring to simulate fabric thickness?
    
    # Let's add a "Neck Trim"
    top_ring = upper_grid[-1]
    
    # Create inner ring
    neck_ring = []
    for s in range(radial_segs):
        idx_outer = top_ring[s]
        vx, vy, vz = vertices[idx_outer]
        
        # Move in and down
        nx = vx * 0.7
        nz = vz * 0.7
        ny = vy + 0.05
        
        idx = add_vert(nx, ny, nz, uvs[idx_outer][0], 1.0)
        neck_ring.append(idx)
        
    # Stitch neck trim
    for s in range(radial_segs):
        sn = (s+1)%radial_segs
        faces.append([top_ring[s], top_ring[sn], neck_ring[sn], neck_ring[s]])

    write_obj('public/models/tshirt.obj', vertices, faces, uvs)

if __name__ == "__main__":
    generate_premium_tshirt()
    print("Generated Premium 3D T-Shirt.")
