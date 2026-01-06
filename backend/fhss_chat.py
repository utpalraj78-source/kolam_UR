import asyncio
import json
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from .fhss_utils import encode_message_fhss, derive_secret_from_params

router = APIRouter()

# Simple in‑memory room manager
class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.clients: Dict[str, WebSocket] = {}
        self.params: Dict[str, Any] = {}
        self.timeout_task: asyncio.Task | None = None
        self.connected: bool = False
        self.approvals: set = set()

    async def broadcast(self, message: str, exclude: str | None = None):
        for uid, ws in self.clients.items():
            if uid != exclude:
                await ws.send_text(message)

    async def close(self):
        for ws in self.clients.values():
            await ws.close()
        self.clients.clear()
        if self.timeout_task:
            self.timeout_task.cancel()
            self.timeout_task = None

class ConnectionManager:
    def __init__(self, wait_seconds: int = 60):
        self.rooms: Dict[str, Room] = {}
        self.wait_seconds = wait_seconds

    def get_room(self, room_id: str) -> Room:
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(room_id)
        return self.rooms[room_id]

    async def schedule_timeout(self, room: Room):
        await asyncio.sleep(self.wait_seconds)
        if not room.connected:
            await room.broadcast(
                json.dumps({
                    "type": "status",
                    "status": "disconnected",
                    "message": "Connection timed out. No peer found.",
                })
            )
            await room.close()
            self.rooms.pop(room.room_id, None)

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        room = self.get_room(room_id)
        if user_id in room.clients:
            raise HTTPException(status_code=400, detail="User ID already connected in this room")
        room.clients[user_id] = websocket
        if len(room.clients) == 1:
            # First client – start timeout
            room.timeout_task = asyncio.create_task(self.schedule_timeout(room))
            await websocket.send_text(
                json.dumps({
                    "type": "status",
                    "status": "waiting",
                    "message": "Waiting for peer...",
                    "roomId": room_id,
                })
            )
        elif len(room.clients) == 2:
            # Second client – cancel timeout
            if room.timeout_task:
                room.timeout_task.cancel()
                room.timeout_task = None
        else:
            # More than two clients – reject
            await websocket.send_text(
                json.dumps({
                    "type": "status",
                    "status": "disconnected",
                    "message": "Room full",
                })
            )
            await websocket.close()
            return

    async def disconnect(self, room_id: str, user_id: str):
        room = self.rooms.get(room_id)
        if not room:
            return
        ws = room.clients.pop(user_id, None)
        
        # Notify other clients if any exist
        if room.clients:
            await room.broadcast(
                json.dumps({
                    "type": "status",
                    "status": "disconnected",
                    "message": "Peer disconnected. Session ended.",
                })
            )
            # Close the room entirely as one peer left
            await room.close()
            self.rooms.pop(room_id, None)
        elif not room.clients:
            self.rooms.pop(room_id, None)

    async def receive_init(self, room: Room, user_id: str, params: Dict[str, Any]):
        room.params[user_id] = params
        if len(room.params) == 2:
            users = list(room.params.keys())
            if room.params[users[0]] == room.params[users[1]]:
                # Instead of auto-connecting, require approval
                await room.broadcast(
                    json.dumps({
                        "type": "status",
                        "status": "approval_required",
                        "message": "Peer matched. Waiting for approval.",
                    })
                )
            else:
                await room.broadcast(
                    json.dumps({
                        "type": "status",
                        "status": "disconnected",
                        "message": "Kolam credentials do not match.",
                    })
                )
                await room.close()
                self.rooms.pop(room.room_id, None)

    async def approve_connection(self, room: Room, user_id: str):
        room.approvals.add(user_id)
        if len(room.approvals) >= 2:
            room.connected = True
            await room.broadcast(
                json.dumps({
                    "type": "status",
                    "status": "connected",
                    "message": "Connection approved by both parties. Secure channel established.",
                })
            )
        else:
            # Notify the user who approved that we are waiting for the other
            ws = room.clients.get(user_id)
            if ws:
                await ws.send_text(
                    json.dumps({
                        "type": "status",
                        "status": "waiting_approval",
                        "message": "Approved. Waiting for peer to approve...",
                    })
                )

manager = ConnectionManager(wait_seconds=60)

@router.websocket("/ws/chat/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    try:
        await manager.connect(websocket, room_id, user_id)
        while True:
            # Receive generic message (text or bytes)
            message = await websocket.receive()
            
            # Handle Binary (Voice Data)
            if "bytes" in message and message["bytes"] is not None:
                # Relay binary data directly to other peers in the room
                room = manager.get_room(room_id)
                # We need a broadcast_bytes method or similar
                # For now, iterate manually
                for uid, ws in room.clients.items():
                    if uid != user_id:
                        try:
                            await ws.send_bytes(message["bytes"])
                        except Exception:
                            pass # Ignore send errors for voice chunks
                continue

            # Handle Text (JSON Control/Chat Messages)
            if "text" in message and message["text"] is not None:
                data = message["text"]
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    continue
            
            msg_type = payload.get("type")
            
            # Init message – contains Kolam parameters
            if msg_type == "init":
                params = payload.get("params", {})
                room = manager.get_room(room_id)
                await manager.receive_init(room, user_id, params)
                continue
                
            # Approval message
            if msg_type == "approve":
                room = manager.get_room(room_id)
                await manager.approve_connection(room, user_id)
                continue

            # Chat message – encode with FHSS and forward
            if msg_type == "chat":
                room = manager.get_room(room_id)
                # Only allow chat if connected
                if not room.connected:
                    continue
                    
                secret_key = derive_secret_from_params(room.params.get(user_id) or {})
                
                # Check if advanced Kolam encryption is requested
                encryption_mode = payload.get("encryption_mode", "basic")  # "basic", "kolam", or "kolam_relay"
                
                if encryption_mode == "kolam_relay":
                    # Message is already encrypted by frontend API call
                    # Just relay the encrypted payload
                    encoded = {
                        "type": "chat",
                        "content": payload.get("content", ""), # This might be empty or a summary
                        "encrypted_payload": payload.get("encrypted_payload"),
                        "timestamp": payload.get("timestamp", int(__import__("time").time() * 1000)),
                        "sender": user_id,
                        "encryption_mode": "kolam"
                    }
                elif encryption_mode == "kolam":
                    # Advanced mode: each chunk gets its own Kolam (Backend encryption)
                    from .fhss_utils import encode_message_kolam_advanced
                    encoded = encode_message_kolam_advanced(
                        payload.get("content", ""), 
                        secret_key, 
                        room_id,
                        channels=64
                    )
                    encoded["sender"] = user_id
                else:
                    # Basic FHSS mode
                    encoded = encode_message_fhss(payload.get("content", ""), secret_key, room_id)
                    encoded["sender"] = user_id
                
                # Preserve timestamp if supplied and not already set
                if "timestamp" in payload and "timestamp" not in encoded:
                    encoded["timestamp"] = payload["timestamp"]
                
                # Ensure content is set for UI display if missing
                if "content" not in encoded:
                    encoded["content"] = payload.get("content", "")

                await room.broadcast(json.dumps(encoded), exclude=user_id)

            # Call Signaling
            if msg_type in ["call_request", "call_accepted", "call_rejected"]:
                room = manager.get_room(room_id)
                if room.connected:
                    await room.broadcast(data, exclude=user_id)
                continue

            # Audio Kolam Payload (New JSON-based audio)
            if msg_type == "audio_kolam":
                room = manager.get_room(room_id)
                if room.connected:
                    # Relay the exact JSON payload to the peer
                    await room.broadcast(data, exclude=user_id)
                continue

    except WebSocketDisconnect:
        await manager.disconnect(room_id, user_id)
    except Exception as e:
        await manager.disconnect(room_id, user_id)
        raise e
