import asyncio
import websockets
import json
import base64
import wave
import os
import sys
import subprocess
import time

# CONFIGURATION
INPUT_FILENAME = "brooklyn_bridge_converted.wav" 
OUTPUT_FILENAME = "ai_response.wav"

async def send_wav_file():
    uri = "ws://127.0.0.1:8000/ws/chat"
    
    if not os.path.exists(INPUT_FILENAME):
        print(f"❌ Error: File '{INPUT_FILENAME}' not found!")
        return

    print(f"\n🔌 Connecting to {uri}...")
    async with websockets.connect(uri) as websocket:
        print("✅ Connected!")
        
        # Buffer to store received audio
        all_audio_bytes = bytearray()

        # 1. Start Listener Task
        async def receive_responses():
            nonlocal all_audio_bytes
            try:
                async for message in websocket:
                    data = json.loads(message)
                    server_content = data.get("serverContent", {})

                    if "modelTurn" in server_content:
                        parts = server_content["modelTurn"].get("parts", [])
                        for part in parts:
                            if "inlineData" in part:
                                b64_data = part["inlineData"]["data"]
                                pcm_data = base64.b64decode(b64_data)
                                all_audio_bytes.extend(pcm_data)
                                sys.stdout.write("🔊") 
                                sys.stdout.flush()
                    
                    if server_content.get("turnComplete"):
                        print("\n✅ AI Finished Speaking.")
                        return 
                        
            except websockets.exceptions.ConnectionClosed:
                print("\n⚠️ Connection Closed.")

        listen_task = asyncio.create_task(receive_responses())

        # 2. Open WAV File & Calculate Timings
        with wave.open(INPUT_FILENAME, 'rb') as wf:
            framerate = wf.getframerate()
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            
            # CHUNK CONFIGURATION
            CHUNK_FRAMES = 2048 # Number of frames per chunk
            CHUNK_BYTES = CHUNK_FRAMES * n_channels * sampwidth
            
            # EXACT DURATION of one chunk (Avoids Chipmunk effect)
            CHUNK_DURATION = CHUNK_FRAMES / framerate 

            print(f"🎤 Loaded {INPUT_FILENAME}")
            print(f"   - Rate: {framerate}Hz")
            print(f"   - Time per chunk: {CHUNK_DURATION:.4f}s")
            
            # --- PHASE A: SEND SILENCE (WARM UP) ---
            # Sending 0.5s of silence helps the AI 'hear' the start of your sentence
            print("🤫 Sending silence to warm up VAD...")
            silence_chunk = b'\x00' * CHUNK_BYTES
            for _ in range(5): # Send ~5 chunks of silence
                b64_silence = base64.b64encode(silence_chunk).decode("utf-8")
                await websocket.send(json.dumps({
                    "realtimeInput": {
                        "mediaChunks": [{
                            "data": b64_silence,
                            "mimeType": "audio/pcm"
                        }]
                    }
                }))
                await asyncio.sleep(CHUNK_DURATION)

            # --- PHASE B: STREAM AUDIO ---
            print(f"🗣️ Streaming voice data...")
            data = wf.readframes(CHUNK_FRAMES)
            
            while len(data) > 0:
                b64_audio = base64.b64encode(data).decode("utf-8")
                
                await websocket.send(json.dumps({
                    "realtimeInput": {
                        "mediaChunks": [{
                            "data": b64_audio,
                            "mimeType": "audio/pcm"
                        }]
                    }
                }))
                
                # CRITICAL: Sleep for the exact duration of the audio we just sent
                await asyncio.sleep(CHUNK_DURATION) 
                
                data = wf.readframes(CHUNK_FRAMES)

        # 3. Tell Gemini we are done
        print("\n🛑 Sending 'turnComplete' signal...")
        await websocket.send(json.dumps({"clientContent": {"turnComplete": True}}))

        # 4. Wait for response
        try:
            await asyncio.wait_for(listen_task, timeout=20.0)
        except asyncio.TimeoutError:
            print("Timeout waiting for response.")

        # 5. Save & Play
        if len(all_audio_bytes) > 0:
            print(f"\n💾 Saving to {OUTPUT_FILENAME}...")
            with wave.open(OUTPUT_FILENAME, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(24000) # Gemini Native Audio is usually 24kHz
                wf.writeframes(all_audio_bytes)
            
            print("▶️ Playing response...")
            # Try Mac play, fallback to print
            try:
                subprocess.call(["afplay", OUTPUT_FILENAME]) 
            except:
                print(f"👉 Please play '{OUTPUT_FILENAME}' manually.")
        else:
            print("⚠️ No audio received.")

if __name__ == "__main__":
    asyncio.run(send_wav_file())