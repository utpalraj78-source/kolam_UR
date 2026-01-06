import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://localhost:8000/ws/chat/testroom/testuser"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # Send init payload
            init_payload = {
                "type": "init",
                "params": {
                    "symmetry": "test",
                    "k": 5,
                    "randomness": 3,
                    "seed": 123
                }
            }
            print(f"Sending: {init_payload}")
            await websocket.send(json.dumps(init_payload))
            
            # Wait for response
            response = await websocket.recv()
            print(f"Received: {response}")
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
