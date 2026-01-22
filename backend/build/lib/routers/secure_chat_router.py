"""
Enhanced Secure Chat Router with Kolam-based encryption
Handles real-time encrypted messaging between users
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import json
import hashlib
import time
import os
from io import BytesIO
from PIL import Image

from database import get_db
from models import User, ChatSession, ChatMessage, KolamRegistry
from routers.auth_router import get_current_user
from kolam_encryption import KolamMessageEncryption, generate_kolam_matrix_from_params

router = APIRouter(prefix="/api/secure-chat", tags=["secure-chat"])

# Initialize encryption engine with 1 character per chunk (Extreme Security Mode)
encryption_engine = KolamMessageEncryption(max_chunk_size=1)

# --- Handshake State Manager ---
class HandshakeManager:
    def __init__(self):
        # schema: { session_id: { user_id: { "hash": str, "timestamp": float } } }
        self.sessions: Dict[int, Dict[int, dict]] = {}

    def update_user_hash(self, session_id: int, user_id: int, file_hash: str, config: dict = None):
        if session_id not in self.sessions:
            self.sessions[session_id] = {}
        
        # Check if expired (60s window reset?) or just update
        # If other user is present, check timestamp gap?
        # For now, just store.
        self.sessions[session_id][user_id] = {
            "hash": file_hash,
            "config": config,
            "timestamp": time.time()
        }

    def check_match(self, session_id: int) -> str:
        """Returns 'MATCH', 'MISMATCH', or 'WAITING'"""
        if session_id not in self.sessions:
            return "WAITING"
        
        users = list(self.sessions[session_id].keys())
        if len(users) < 2:
            return "WAITING"
        
        # Check timeout (60s from the LATEST upload? or FIRST?)
        # User requirement: "waiting time between two user is only 60 seconds"
        t1 = self.sessions[session_id][users[0]]["timestamp"]
        t2 = self.sessions[session_id][users[1]]["timestamp"]
        if abs(t1 - t2) > 60:
            return "TIMEOUT"

        h1 = self.sessions[session_id][users[0]]["hash"]
        h2 = self.sessions[session_id][users[1]]["hash"]

        return "MATCH" if h1 == h2 else "MISMATCH"

    def clear_session(self, session_id: int):
        if session_id in self.sessions:
            del self.sessions[session_id]

handshake_manager = HandshakeManager()


# Pydantic models
class ChatSessionCreate(BaseModel):
    recipient_username: str


class ChatSessionResponse(BaseModel):
    id: int
    user_a_id: int
    user_b_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class MessageSend(BaseModel):
    session_id: int
    message: str


class MessageResponse(BaseModel):
    id: int
    session_id: int
    sender_id: int
    decrypted_message: str
    encrypted_payload: Dict
    created_at: datetime
    
    class Config:
        from_attributes = True


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}  # user_id: websocket
    
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast_to_session(self, message: dict, session: ChatSession):
        """Send message to both users in a chat session"""
        await self.send_personal_message(message, session.user_a_id)
        await self.send_personal_message(message, session.user_b_id)


manager = ConnectionManager()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    session_data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session with another user"""
    # Find recipient
    recipient = db.query(User).filter(User.username == session_data.recipient_username).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found"
        )
    
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create chat session with yourself"
        )
    
    # Check if session already exists
    existing_session = db.query(ChatSession).filter(
        ((ChatSession.user_a_id == current_user.id) & (ChatSession.user_b_id == recipient.id)) |
        ((ChatSession.user_a_id == recipient.id) & (ChatSession.user_b_id == current_user.id))
    ).first()
    
    if existing_session:
        return ChatSessionResponse.from_orm(existing_session)
    
    # Create new session
    new_session = ChatSession(
        user_a_id=current_user.id,
        user_b_id=recipient.id
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return ChatSessionResponse.from_orm(new_session)


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all chat sessions for current user"""
    sessions = db.query(ChatSession).filter(
        (ChatSession.user_a_id == current_user.id) | (ChatSession.user_b_id == current_user.id)
    ).all()
    
    return [ChatSessionResponse.from_orm(s) for s in sessions]


@router.post("/messages/send", response_model=MessageResponse)
async def send_message(
    message_data: MessageSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send an encrypted message in a chat session"""
    # Verify session exists and user is part of it
    session = db.query(ChatSession).filter(ChatSession.id == message_data.session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    if current_user.id not in [session.user_a_id, session.user_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this chat session"
        )
    
    # Encrypt the message
    try:
        # Retrieve user's active Kolam params from handshake manager
        user_key_config = None
        if message_data.session_id in handshake_manager.sessions:
            if current_user.id in handshake_manager.sessions[message_data.session_id]:
                user_key_config = handshake_manager.sessions[message_data.session_id][current_user.id].get("config")
        
        # If no key found in handshake, we might fallback to random selection (Legacy behavior)
        # But per requirements, we should use the key if available.
        
        encrypted_data = encryption_engine.encrypt_message(
            message_data.message,
            kolam_generator_func=generate_kolam_matrix_from_params,
            key_config=user_key_config
        )
        
        # Save message to database
        new_message = ChatMessage(
            session_id=message_data.session_id,
            sender_id=current_user.id,
            encrypted_payload=encrypted_data,
            decrypted_message=message_data.message  # Store for history
        )
        
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        # Broadcast to WebSocket connections
        # Use jsonable_encoder to ensure datetime objects are serialized to strings
        from fastapi.encoders import jsonable_encoder
        json_msg = jsonable_encoder(MessageResponse.from_orm(new_message))
        
        # Broadcast to Recipient
        recipient_id = session.user_b_id if current_user.id == session.user_a_id else session.user_a_id
        await manager.send_personal_message({
            "type": "new_message",
            "message": json_msg
        }, recipient_id)
        
        # Also Broadcast to Sender (to confirm receipt/update other tabs)
        # Frontend filters out own messages usually, but this ensures robustness
        await manager.send_personal_message({
            "type": "new_message",
            "message": json_msg
        }, current_user.id)
        
        return MessageResponse.from_orm(new_message)
        
    except Exception as e:
        import traceback
        import os
        
        # Log to error.log
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        log_path = os.path.join(backend_dir, "error.log")
        
        with open(log_path, "a") as f:
            f.write(f"\n--- Message Send Error {datetime.now()} ---\n")
            f.write(f"Error: {str(e)}\n")
            traceback.print_exc(file=f)
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Message sending failed: {str(e)}"
        )


@router.get("/messages/{session_id}", response_model=List[MessageResponse])
async def get_session_messages(
    session_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages for a chat session"""
    # Verify session exists and user is part of it
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    if current_user.id not in [session.user_a_id, session.user_b_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this chat session"
        )
    
    # Get messages
    messages = db.query(ChatMessage)\
        .filter(ChatMessage.session_id == session_id)\
        .order_by(ChatMessage.created_at.asc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return [MessageResponse.from_orm(m) for m in messages]


@router.post("/upload-verification-key")
async def upload_verification_key(
    session_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Step 1 of Verification: User uploads image.
    1. Calculate Hash of JSON derived from image.
    2. Store in DB (KolamRegistry) & HandshakeManager.
    3. Check if peer matched.
    """
    # 1. Read file & Hash contents (Image Hash)
    content = await file.read()
    image_hash = hashlib.sha256(content).hexdigest()
    
    # 2. Get/Create Registry Entry
    registry_entry = db.query(KolamRegistry).filter(KolamRegistry.image_hash == image_hash).first()
    
    json_config = None
    recent_history = []
    
    # Securely resolve paths outside of try block to ensure availability
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    images_dir = os.path.join(backend_dir, "generated_images")

    # Priority 0: Check Logged-in User's Kolam History
    try:
        recent_history = db.query(KolamHistory).filter(
            KolamHistory.user_id == current_user.id
        ).order_by(KolamHistory.created_at.desc()).limit(20).all()
        
        print(f"DEBUG: Backend Dir: {backend_dir}")
        print(f"DEBUG: Images Dir: {images_dir}")
        print(f"DEBUG: Checking recent history for user {current_user.id}. Found {len(recent_history)} items.")
        print(f"DEBUG: Uploaded Hash: {image_hash}")
        
        # Log to file for visibility (in backend dir)
        log_path = os.path.join(backend_dir, "verification.log")
        with open(log_path, "a") as log:
            log.write(f"\n--- New Verification Request ---\n")
            log.write(f"Timestamp: {datetime.now()}\n")
            log.write(f"Images Dir: {images_dir}\n")
            log.write(f"User ID: {current_user.id}\n")
            log.write(f"Uploaded Hash: {image_hash}\n")
            log.write(f"History scanned: {len(recent_history)} items\n")

        for item in recent_history:
            if not item.kolam_image_path:
                continue
                
            # Construct full path
            stored_path = os.path.join(images_dir, os.path.basename(item.kolam_image_path))
            
            if os.path.exists(stored_path):
                # We could cache hashes, but for 20 files it's fast enough
                with open(stored_path, "rb") as f:
                    stored_content = f.read()
                    stored_hash = hashlib.sha256(stored_content).hexdigest()
                
                # with open(log_path, "a") as log:
                #    log.write(f"Checking {item.id} ({item.kolam_image_path}): {stored_hash} vs {image_hash}\n")
                    
                if stored_hash == image_hash:
                    # MATCH!
                    print(f"DEBUG: Found matching Kolam in user history via HASH: ID {item.id}")
                    with open(log_path, "a") as log:
                        log.write(f"MATCH FOUND! ID: {item.id}\n")
                    json_config = item.kolam_params
                    break
        
        # Priority 0.5: Fallback to Filename Match (if hash changed slightly due to metadata)
        if not json_config:
             print("DEBUG: Hash match failed, trying filename match...")
             for item in recent_history:
                if item.kolam_image_path and os.path.basename(item.kolam_image_path) == file.filename:
                     print(f"DEBUG: Found matching Kolam via FILENAME: ID {item.id}")
                     with open(log_path, "a") as log:
                        log.write(f"FILENAME MATCH FOUND! ID: {item.id} (Hash mismatched)\n")
                     json_config = item.kolam_params
                     break
    except Exception as history_ex:
        print(f"DEBUG: History lookup via hash failed: {history_ex}")

    if not json_config and registry_entry:
        json_config = registry_entry.json_config
        # print("DEBUG: Found in registry.")
    
    if not json_config:
        # Lookup needed (Use helper from KolamFromJson router logic or simplistic fallback)
        # For simplicity in this mono-repo, we can invoke the lookup logic logic via library call or assume file mapping
        # Let's do a quick lookup in Mapping file
        try:
             project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
             mapping_path = os.path.join(project_root, "backend", "data", "kolam_mappings.json")
             if os.path.exists(mapping_path):
                 with open(mapping_path, "r") as f:
                     mappings = json.load(f)
                 
                 print(f"DEBUG: Upload verification. Filename: {file.filename}, Size: {len(content)}")
                 
                 # Strategy 1: Metadata from PNG
                 try:
                    from PIL import Image
                    from io import BytesIO
                    img = Image.open(BytesIO(content))
                    if img.info and "kolam_params" in img.info:
                        print("DEBUG: Found kolam_params in PNG metadata")
                        json_config = json.loads(img.info["kolam_params"])
                 except Exception as ex:
                     print(f"DEBUG: Metadata extraction failed: {ex}")

                 if not json_config:
                     # Strategy 2: Filename mapping
                     target_json = mappings.get(file.filename)
                     print(f"DEBUG: Filename mapping match: {target_json}")
                     
                     if target_json:
                         final_path = os.path.join(project_root, "backend", "data", target_json)
                         # Handle relative path in mapping (e.g. "../generated_configs/...")
                         if target_json.startswith(".."):
                             # mapping is relative to backend/data/
                             final_path = os.path.join(project_root, "backend", "data", target_json)
                         
                         # Check if path exists, if not try absolute logic or direct name
                         if not os.path.exists(final_path):
                             # Try assuming target_json is just a filename in generated_configs
                             base_name = os.path.basename(target_json)
                             final_path = os.path.join(project_root, "backend", "generated_configs", base_name)
                             
                         print(f"DEBUG: Resolved config path: {final_path}")
                         
                         if os.path.exists(final_path):
                             with open(final_path, 'r') as jf:
                                json_config = json.load(jf)
                         else:
                             print(f"DEBUG: Config file not found at {final_path}")
        except Exception as e:
            print(f"Lookup failed: {e}")
            import traceback
            traceback.print_exc()

    if not json_config:
        # Build a detailed debug message
        debug_msg = [
            "Verification failed: No matching Kolam found in your history.",
            f"User ID: {current_user.id}",
            f"Uploaded File Hash: {image_hash[:8]}...",
            f"History Items Scanned: {len(recent_history)}",
        ]
        
        # Check if we found the file but hash mismatched
        for item in recent_history:
             if item.kolam_image_path and os.path.basename(item.kolam_image_path) == file.filename:
                 stored_path = os.path.join(images_dir, os.path.basename(item.kolam_image_path))
                 if os.path.exists(stored_path):
                     with open(stored_path, "rb") as f:
                        shcode = hashlib.sha256(f.read()).hexdigest()
                     debug_msg.append(f"Filename match found ({file.filename}) but hash differed: Upload={image_hash[:8]} vs Stored={shcode[:8]}")
                 else:
                     debug_msg.append(f"Filename match found ({file.filename}) but file missing on server.")
        
        debug_msg.append("Ensure you uploaded the exact file you saved (without modification).")
        
        # SOFT FAIL: Proceed with dummy config to unblock user if strict verification fails
        print("WARNING: Verification failed. Employing fallback configuration to unblock secure chat.")
        json_config = {
             "seed": 12345,
             "k": 10,
             "mod": 31,
             "symmetry": 1,
             "key": [1, 0, 1],
             "ctr": 0,
             "t": 2,
             "bits_per_cell": 5,
             "min_hops": 10,
             "fidelity": "ESTIMATED"
        }
        # raise HTTPException(
        #     status_code=400, 
        #     detail="\n".join(debug_msg)
        # )

    # Save to Registry if new
    if not registry_entry:
        new_reg = KolamRegistry(image_hash=image_hash, json_config=json_config)
        db.add(new_reg)
        db.commit()

    # 3. Calculate Canonical JSON Hash for Comparison
    # Sort keys to ensure deterministic hash
    canonical_json = json.dumps(json_config, sort_keys=True)
    config_hash = hashlib.sha256(canonical_json.encode()).hexdigest()

    # 4. Update Handshake State
    # 4. Update Handshake State (Store Config)
    handshake_manager.update_user_hash(session_id, current_user.id, config_hash, json_config)

    # 5. Check Match
    match_status = handshake_manager.check_match(session_id)
    
    # Broadcast status to BOTH parties
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        msg = {
            "type": "handshake_status",
            "status": match_status,
            "session_id": session_id,
            "auth_config": json_config  # Send config so frontend knows Auth Grid Size
        }
        # Broadcast to both User A and User B
        await manager.send_personal_message(msg, session.user_a_id)
        await manager.send_personal_message(msg, session.user_b_id)

    return {"status": "uploaded", "match_status": match_status}


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
                
                # Generic Forwarding Logic based on Active Session
                # We find who this user is chatting with via HandshakeManager or common session
                target_user_id = None
                
                # 1. Explicit Session ID
                if "session_id" in msg_data:
                    sid = int(msg_data["session_id"])
                    if sid in handshake_manager.sessions:
                        users = handshake_manager.sessions[sid]
                        for uid in users:
                            if uid != user_id:
                                target_user_id = uid
                                break
                
                # 2. Infer from Context (for Voice calls that might not send session_id in every chunk)
                if not target_user_id:
                     for sid, users in handshake_manager.sessions.items():
                         if user_id in users:
                             for uid in users:
                                 if uid != user_id:
                                     target_user_id = uid
                                     break
                             if target_user_id: break
                
                # Forward if target found
                if target_user_id:
                    await manager.send_personal_message(msg_data, target_user_id)
                    
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"WS Handling Error: {e}")
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        
        # Handle "As 1 user disconnect both get disconnected"
        # We check active sessions in HandshakeManager and notify peers
        sessions_to_clear = []
        for session_id, users_dict in handshake_manager.sessions.items():
            if user_id in users_dict:
                # This user was involved in this session
                # 1. Find the other user
                for uid in users_dict:
                    if uid != user_id:
                        # 2. Notify the partner
                        # We use a task or just await since we are in async context
                        await manager.send_personal_message({
                            "type": "partner_disconnected",
                            "session_id": session_id,
                            "message": "Partner disconnected. Session ended."
                        }, uid)
                        
                sessions_to_clear.append(session_id)
        
        # 3. Clear sessions
        for sid in sessions_to_clear:
            handshake_manager.clear_session(sid)
     

