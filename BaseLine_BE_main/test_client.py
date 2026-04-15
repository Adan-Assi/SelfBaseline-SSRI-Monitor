import asyncio
import websockets
import json
import base64

# This pretends to be your React Native App
async def test_connection():
    uri = "ws://127.0.0.1:8000/ws/chat"
    
    print(f"🔌 Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to Proxy!")
            
            # 1. Send a "Fake" Audio Packet (Silence)
            # This triggers the "User Started Speaking" logic in your server
            fake_audio = base64.b64encode(b'\x00' * 32000).decode('utf-8') # 1 sec of silence
            
            payload = {
                "realtime_input": {
                    "media_chunks": [{
                        "data": fake_audio,
                        "mime_type": "audio/pcm"
                    }]
                }
            }
            
            await websocket.send(json.dumps(payload))
            print("📤 Sent fake audio data")
            
            # 2. Listen for Gemini's Reply
            print("👂 Listening for Gemini...")
            while True:
                response = await websocket.recv()
                print(response)
                data = json.loads(response)
                
                # Check what we got back
                if "serverContent" in data:
                    print("✅ Received Audio/Text from Gemini!")
                    # Check if your Server added the DB log logic? 
                    # (You won't see the DB log here, check your Supabase dashboard!)
                    break
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())