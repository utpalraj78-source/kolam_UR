import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/chat/test_room/test_user"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket")
            
            # Send init message
            init_payload = {
                "type": "init",
                "params": {
                    "symmetry": "radial",
                    "randomness": 2,
                    "k": 4,
                    "seed": 123,
                    "mod": 16
                }
            }
            await websocket.send(json.dumps(init_payload))
            print(f"Sent init: {init_payload}")
            
            # Receive response
            response = await websocket.recv()
            print(f"Received: {response}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
