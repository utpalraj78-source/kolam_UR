from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from features.KolamCaptcha.backend.models import CaptchaChallenge
from backend.kolam_generator import generate_kolam
import random
import io
import base64
import math
from PIL import Image, ImageDraw

router = APIRouter(prefix="/api/captcha", tags=["Captcha"])

def get_kolam_image(seed, k, symmetry="radial"):
    # Generates a Kolam image with requested params
    try:
        # Randomness between 2.0 and 10.0 as requested
        rnd_val = random.uniform(2.0, 10.0)
        
        # Use random bright colors for better UI
        palette = ["#F472B6", "#A78BFA", "#34D399", "#60A5FA", "#F87171", "#FBBF24"]
        curve_c = random.choice(palette)
        dot_c = "#FFFFFF" 

        result = generate_kolam(symmetry, rnd_val, k, seed, analyze=False, return_preview=True,
                                curve_color=curve_c, dot_color=dot_c, layout="Square grid (no rotate)",
                                grid_color="#334155")
        return result[5]
    except Exception as e:
        print(f"Gen Fail: {e}")
        return None

def generate_safe(seed, k, symmetry="radial", attempts=3):
    """Helper to retry generation if it returns None."""
    for _ in range(attempts):
        b = get_kolam_image(seed, k, symmetry)
        if b: return b
    return None

def to_b64(bytes_val):
    if not bytes_val: return None
    buf = io.BytesIO(bytes_val)
    return base64.b64encode(buf.getvalue()).decode('utf-8')

@router.get("/generate-assembler")
def generate_assembler(db: Session = Depends(get_db)):
    seed = random.randint(1, 100000)
    k = random.choice([6, 8, 10, 12, 14, 16]) 
    png_bytes = generate_safe(seed, k, "radial")
    
    if not png_bytes:
        # Fallback to a known seed if random fails repeatedly
        png_bytes = generate_safe(12345, 8, "radial")
        if not png_bytes:
             raise HTTPException(500, "Failed to generate Kolam image")

    # Slice into 4
    img = Image.open(io.BytesIO(png_bytes))
    w, h = img.size
    # Assuming square logic
    half_w, half_h = w // 2, h // 2
    
    # 0: TL, 1: TR, 2: BL, 3: BR
    quads = []
    quads.append(img.crop((0, 0, half_w, half_h)))
    quads.append(img.crop((half_w, 0, w, half_h)))
    quads.append(img.crop((0, half_h, half_w, h)))
    quads.append(img.crop((half_w, half_h, w, h)))
    
    # Create permutation
    indices = [0, 1, 2, 3]
    random.shuffle(indices) # e.g. [3, 0, 1, 2] means Image0 is Quad3
    
    shuffled_quads_b64 = []
    for idx in indices:
        buf = io.BytesIO()
        quads[idx].save(buf, format="PNG")
        shuffled_quads_b64.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        
    challenge = CaptchaChallenge(
        challenge_type='assembler',
        kolam_seed=seed,
        kolam_k=k,
        correct_solution=indices
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "images": shuffled_quads_b64, 
    }
    
@router.get("/generate-completion")
def generate_completion(db: Session = Depends(get_db)):
    seed = random.randint(1, 100000)
    k = random.choice([6, 8, 10, 12, 14, 16])
    png_bytes = generate_safe(seed, k, "radial")
    
    if not png_bytes:
        raise HTTPException(500, "Gen failed")
    
    img = Image.open(io.BytesIO(png_bytes))
    w, h = img.size
    half_w, half_h = w // 2, h // 2
    
    # We mask the Bottom Right (Index 3 logic from before, but visually BR)
    question_img = img.copy()
    draw = ImageDraw.Draw(question_img)
    # Mask BR
    draw.rectangle([(half_w, half_h), (w, h)], fill="white", outline="gray")
    
    # Target Quad (Correct Answer)
    correct_quad = img.crop((half_w, half_h, w, h))
    
    # Generate Distractors
    distractors = []
    attempts = 0
    while len(distractors) < 4 and attempts < 20:
        attempts += 1
        rand_seed = random.randint(1, 200000)
        if rand_seed == seed: continue
        
        d_bytes = generate_safe(rand_seed, k, "radial", attempts=1)
        if d_bytes:
            d_img = Image.open(io.BytesIO(d_bytes))
            # Take BR quad
            d_quad = d_img.crop((half_w, half_h, w, h)) 
            distractors.append(d_quad)
            
    # Fallback fill
    while len(distractors) < 4:
         distractors.append(correct_quad.copy()) # Should not happen often
            
    # Mix correct solution
    # Distractors [d1, d2, d3, d4] + Correct
    
    final_options_b64 = []
    correct_idx = 0
    
    # We want 5 options total
    perm = list(range(len(distractors) + 1)) # Should be 5
    random.shuffle(perm)
    
    all_quads_source = distractors + [correct_quad] # 0..3 are distractors, 4 is correct
    
    # But wait, 'perm' shuffles the positions
    # If perm is [0, 4, 1, 2, 3]
    # Option 0 = source[0] (Distractor)
    # Option 1 = source[4] (Correct) -> Correct Index = 1
    
    for i, source_idx in enumerate(perm): # source_idx refers to index in all_quads_source
        quad = all_quads_source[source_idx]
        
        # If source_idx is the last one (4), it is correct
        if source_idx == len(distractors): 
            correct_idx = i
            
        buf = io.BytesIO()
        quad.save(buf, format="PNG")
        final_options_b64.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        
    buf_q = io.BytesIO()
    question_img.save(buf_q, format="PNG")
    question_b64 = base64.b64encode(buf_q.getvalue()).decode('utf-8')
    
    challenge = CaptchaChallenge(
        challenge_type='completion',
        kolam_seed=seed,
        kolam_k=k,
        correct_solution=correct_idx
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "question_image": question_b64,
        "options": final_options_b64
    }

@router.get("/generate-memory")
def generate_memory(db: Session = Depends(get_db)):
    """Type 3: Memory Mode."""
    k = random.choice([6, 8]) # Small K for memory is better
    
    # 1. Generate Target
    target_seed = random.randint(1, 100000)
    target_bytes = generate_safe(target_seed, k, "radial")
    if not target_bytes: raise HTTPException(500, "Gen failed")
    
    target_b64 = to_b64(target_bytes)

    # 2. Generate Distractors (Same K, different seeds)
    distractors_b64 = []
    attempts = 0
    while len(distractors_b64) < 3 and attempts < 15:
        attempts += 1
        d_seed = random.randint(1, 100000)
        if d_seed == target_seed: continue
        
        d_bytes = generate_safe(d_seed, k, "radial", attempts=1)
        if d_bytes:
             distractors_b64.append(to_b64(d_bytes))

    # Fallback
    while len(distractors_b64) < 3:
         distractors_b64.append(target_b64) # Duplicate target if needed (rare)

    # 3. Prepare Display Data
    
    # Options = Target + Distractors shuffled
    all_imgs = distractors_b64 + [target_b64]
    perm = list(range(4))
    random.shuffle(perm)
    
    final_options = []
    correct_idx = 0
    for i, source_idx in enumerate(perm):
        # 3 is the index of target in all_imgs
        if source_idx == 3:
            correct_idx = i
            final_options.append(target_b64)
        else:
            final_options.append(distractors_b64[source_idx])

    challenge = CaptchaChallenge(
        challenge_type='memory',
        kolam_seed=target_seed,
        kolam_k=k,
        correct_solution=correct_idx
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "target_image": target_b64,
        "options": final_options
    }
    png_bytes = generate_safe(seed, k, "radial")
    
    if not png_bytes:
        # Fallback to a known seed if random fails repeatedly
        png_bytes = generate_safe(12345, 8, "radial")
        if not png_bytes:
             raise HTTPException(500, "Failed to generate Kolam image")

    # Slice into 4
    img = Image.open(io.BytesIO(png_bytes))
    w, h = img.size
    # Assuming square logic
    half_w, half_h = w // 2, h // 2
    
    # 0: TL, 1: TR, 2: BL, 3: BR
    quads = []
    quads.append(img.crop((0, 0, half_w, half_h)))
    quads.append(img.crop((half_w, 0, w, half_h)))
    quads.append(img.crop((0, half_h, half_w, h)))
    quads.append(img.crop((half_w, half_h, w, h)))
    
    # Create permutation
    indices = [0, 1, 2, 3]
    random.shuffle(indices) # e.g. [3, 0, 1, 2] means Image0 is Quad3
    
    shuffled_quads_b64 = []
    for idx in indices:
        buf = io.BytesIO()
        quads[idx].save(buf, format="PNG")
        shuffled_quads_b64.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        
    challenge = CaptchaChallenge(
        challenge_type='assembler',
        kolam_seed=seed,
        kolam_k=k,
        correct_solution=indices
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "images": shuffled_quads_b64, 
    }
    
@router.get("/generate-completion")
def generate_completion(db: Session = Depends(get_db)):
    seed = random.randint(1, 100000)
    k = random.choice([6, 8, 10, 12, 14, 16])
    png_bytes = generate_safe(seed, k, "radial")
    
    if not png_bytes:
        raise HTTPException(500, "Gen failed")
    
    img = Image.open(io.BytesIO(png_bytes))
    w, h = img.size
    half_w, half_h = w // 2, h // 2
    
    # Randomly choose which quadrant is missing (0: TL, 1: TR, 2: BL, 3: BR)
    missing_quad_idx = random.choice([0, 1, 2, 3])
    
    # Define coords for each quad
    # (left, top, right, bottom)
    quad_coords = [
        (0, 0, half_w, half_h),         # 0: TL
        (half_w, 0, w, half_h),         # 1: TR
        (0, half_h, half_w, h),         # 2: BL
        (half_w, half_h, w, h)          # 3: BR
    ]
    
    target_box = quad_coords[missing_quad_idx]
    
    # Prepare Question Image (Mask the missing quad)
    question_img = img.copy()
    draw = ImageDraw.Draw(question_img)
    draw.rectangle([(target_box[0], target_box[1]), (target_box[2], target_box[3])], fill="white", outline="gray")
    
    # Extract Correct Answer Quad
    correct_quad = img.crop(target_box)
    
    # Generate Distractors (Must be same quadrant from different Kolams)
    distractors = []
    attempts = 0
    while len(distractors) < 4 and attempts < 20:
        attempts += 1
        rand_seed = random.randint(1, 200000)
        if rand_seed == seed: continue
        
        d_bytes = generate_safe(rand_seed, k, "radial", attempts=1)
        if d_bytes:
            d_img = Image.open(io.BytesIO(d_bytes))
            # Crop the SAME quadrant so it looks like a plausible fit
            d_quad = d_img.crop(target_box) 
            distractors.append(d_quad)
            
    # Fallback fill
    while len(distractors) < 4:
         distractors.append(correct_quad.copy()) 
            
    # Mix correct solution
    final_options_b64 = []
    correct_idx = 0
    
    perm = list(range(len(distractors) + 1)) 
    random.shuffle(perm)
    
    all_quads_source = distractors + [correct_quad] 
    
    for i, source_idx in enumerate(perm): 
        quad = all_quads_source[source_idx]
        
        if source_idx == len(distractors): 
            correct_idx = i
            
        buf = io.BytesIO()
        quad.save(buf, format="PNG")
        final_options_b64.append(base64.b64encode(buf.getvalue()).decode('utf-8'))
        
    buf_q = io.BytesIO()
    question_img.save(buf_q, format="PNG")
    question_b64 = base64.b64encode(buf_q.getvalue()).decode('utf-8')
    
    challenge = CaptchaChallenge(
        challenge_type='completion',
        kolam_seed=seed,
        kolam_k=k,
        correct_solution=correct_idx
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "question_image": question_b64,
        "options": final_options_b64
    }

@router.get("/generate-memory")
def generate_memory(db: Session = Depends(get_db)):
    """Type 3: Memory Mode."""
    k = random.choice([6, 8]) # Small K for memory is better
    
    # 1. Generate Target
    target_seed = random.randint(1, 100000)
    target_bytes = generate_safe(target_seed, k, "radial")
    if not target_bytes: raise HTTPException(500, "Gen failed")
    
    target_b64 = to_b64(target_bytes)

    # 2. Generate Distractors (Same K, different seeds)
    distractors_b64 = []
    attempts = 0
    while len(distractors_b64) < 3 and attempts < 15:
        attempts += 1
        d_seed = random.randint(1, 100000)
        if d_seed == target_seed: continue
        
        d_bytes = generate_safe(d_seed, k, "radial", attempts=1)
        if d_bytes:
             distractors_b64.append(to_b64(d_bytes))

    # Fallback
    while len(distractors_b64) < 3:
         distractors_b64.append(target_b64) # Duplicate target if needed (rare)

    # 3. Prepare Display Data
    
    # Options = Target + Distractors shuffled
    all_imgs = distractors_b64 + [target_b64]
    perm = list(range(4))
    random.shuffle(perm)
    
    final_options = []
    correct_idx = 0
    for i, source_idx in enumerate(perm):
        # 3 is the index of target in all_imgs
        if source_idx == 3:
            correct_idx = i
            final_options.append(target_b64)
        else:
            final_options.append(distractors_b64[source_idx])

    challenge = CaptchaChallenge(
        challenge_type='memory',
        kolam_seed=target_seed,
        kolam_k=k,
        correct_solution=correct_idx
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "target_image": target_b64,
        "options": final_options
    }

@router.get("/generate-rotate")
def generate_rotate(db: Session = Depends(get_db)):
    """Type 4: Rotate. Rotate from Initial to Target."""
    seed = random.randint(1, 100000)
    k = random.choice([8, 10, 12])
    
    png_bytes = generate_safe(seed, k, "radial")
    if not png_bytes: raise HTTPException(500, "Gen failed")
    
    img = Image.open(io.BytesIO(png_bytes))
    
    # Initial random state
    initial_angle = random.randint(0, 359)
    # Target random state (ensure it's at least 30 deg away)
    offset = random.choice([-1, 1]) * random.randint(40, 140)
    target_angle = (initial_angle + offset) % 360
    
    # We apply the INITIAL rotation to the image we send
    rotated = img.rotate(initial_angle, expand=False) 
    
    buf = io.BytesIO()
    rotated.save(buf, format="PNG")
    rotated_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    # Correct Answer is the DELTA the user must apply
    # If user has slider starting at 0, they must move it to `offset`.
    # But visually we might just want to check final angle.
    # Let's simple ask user to submit the FINAL angle they think it is at.
    # But wait, frontend slider usually adds to current.
    # Let's say user submits the "Angle Added".
    # correct = offset.
    # But offset can be negative or via 360.
    # Let's store the TARGET ANGLE as solution. The frontend sends the (Initial + UserAdjust) value.
    
    challenge = CaptchaChallenge(
        challenge_type='rotate',
        kolam_seed=seed,
        kolam_k=k,
        correct_solution=int(target_angle)
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "image": rotated_b64,
        "initial_angle": initial_angle,
        "target_angle": target_angle
    }

@router.get("/generate-slider")
def generate_slider(db: Session = Depends(get_db)):
    """Type 5: Slider. Generic Axis (H, V, Diagonal)."""
    seed = random.randint(1, 100000)
    k = 10 
    
    png_bytes = generate_safe(seed, k, "radial")
    if not png_bytes: raise HTTPException(500, "Gen failed")
    
    img = Image.open(io.BytesIO(png_bytes))
    img = img.resize((300, 300))
    w, h = img.size
    p_w, p_h = 60, 60
    
    # Define Safe Zone for piece center (so it doesn't clip edge)
    min_x, max_x = 0, w - p_w
    min_y, max_y = 0, h - p_h
    
    # Pick HOLE position (Correct Answer)
    # Force Hole to be on the right side to allow Left->Right sliding
    hole_x = random.randint(70, max_x)
    hole_y = random.randint(min_y, max_y)
    
    # Pick Axis
    axis = 'horizontal' 
    
    # Force Start to be on the Left
    start_x = 10 
    # Random Start Y (needs vertical adjustment)
    start_x = 10
    start_y = random.randint(min_y, max_y)
    while abs(start_y - hole_y) < 30: # Ensure it's not too coincidentally close
         start_y = random.randint(min_y, max_y)
    
    # Crop Piece from HOLE coordinates (the target image)
    piece = img.crop((hole_x, hole_y, hole_x + p_w, hole_y + p_h))
    
    # Background with hole
    bg = img.copy()
    bg = bg.convert("RGBA")
    overlay = Image.new('RGBA', img.size, (0,0,0,0))
    d_over = ImageDraw.Draw(overlay)
    d_over.rectangle([(hole_x, hole_y), (hole_x + p_w, hole_y + p_h)], fill=(0,0,0, 150))
    bg = Image.alpha_composite(bg, overlay)
    
    buf_bg = io.BytesIO()
    bg.save(buf_bg, format="PNG")
    bg_b64 = base64.b64encode(buf_bg.getvalue()).decode('utf-8')
    
    # Add Red Border directly to the piece image
    piece_draw = ImageDraw.Draw(piece)
    # Draw rectangle on the edge (0,0) to (w-1, h-1)
    piece_draw.rectangle([(0, 0), (p_w - 1, p_h - 1)], outline="red", width=2)

    buf_p = io.BytesIO()
    piece.save(buf_p, format="PNG")
    p_b64 = base64.b64encode(buf_p.getvalue()).decode('utf-8')
    
    # Store solution as "x,y" string for generic verification
    correct_str = f"{hole_x},{hole_y}"
    
    challenge = CaptchaChallenge(
        challenge_type='slider-advanced', # New internal type to distinguish or just reuse slider
        kolam_seed=seed,
        kolam_k=k,
        correct_solution=correct_str 
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    
    return {
        "challenge_id": challenge.id,
        "background": bg_b64,
        "piece": p_b64,
        "start": {"x": start_x, "y": start_y},
        "target_hint": {"x": hole_x, "y": hole_y} # Frontend needs to know LINE to constrain dragging
    }

@router.post("/verify")
def verify(data: dict, db: Session = Depends(get_db)):
    cid = data.get('challenge_id')
    ans = data.get('answer')
    
    if not cid: raise HTTPException(400, "Missing challenge_id")
    chall = db.query(CaptchaChallenge).filter(CaptchaChallenge.id == cid).first()
    if not chall: raise HTTPException(404, "Challenge not found")
        
    success = False
    
    if chall.challenge_type == 'assembler':
        indices = chall.correct_solution
        if isinstance(ans, list) and len(ans) == 4:
            mapped = [indices[i] for i in ans]
            if mapped == [0, 1, 2, 3]: success = True
            
    elif chall.challenge_type in ['completion', 'odd-one', 'memory']:
        if int(ans) == int(chall.correct_solution): success = True
            
    elif chall.challenge_type == 'rotate':
        # Logic: We stored TARGET angle (0-360).
        # User sends their FINAL angle (0-360).
        # User wants +/- 5 ERROR allowed.
        target = int(chall.correct_solution)
        user_val = int(ans)
        
        diff = abs(target - user_val)
        diff = min(diff, 360 - diff)
        
        if diff <= 5: # Strict user request
            success = True
            
    elif chall.challenge_type == 'slider' or chall.challenge_type == 'slider-advanced':
        # Ans should be "x,y" or dict {x, y}
        # Stored solution is "x,y"
        target_parts = str(chall.correct_solution).split(',')
        tx, ty = int(target_parts[0]), int(target_parts[1])
        
        # Parse user answer
        ux, uy = 0, 0
        if isinstance(ans, dict):
            ux, uy = ans.get('x', 0), ans.get('y', 0)
        elif isinstance(ans, str) and ',' in ans:
            p = ans.split(',')
            ux, uy = int(p[0]), int(p[1])
        
        # Distance check
        dist = math.sqrt((tx - ux)**2 + (ty - uy)**2)
        
        if dist <= 3: # Stricter "98% exact fit" tolerance
            success = True
            
    return {"success": success}
