import os
import asyncio
import json
import logging
import time
from pathlib import Path

# --- New Imports for WebSocket Proxy ---
import websockets
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.auth import default
from google.auth.transport.requests import Request as GoogleRequest
from dotenv import load_dotenv

# --- Your Existing Imports (Restored) ---
import vertexai
from vertexai.generative_models import GenerativeModel
import psycopg2
from pydantic import BaseModel
from supabase import create_client, Client

# --- Route modules ---
import dependencies
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.patients import router as patients_router
from routes.questions import router as questions_router
from routes.checkin import router as checkin_router
from routes.insights import router as insights_router
from routes.voice import router as voice_router
from routes.sensors import router as sensors_router
from routes.voice_turns import router as voice_turns_router

# --- SETUP LOGGING ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GeminiProxy")

# 1. Load secrets
print("--------------------------------------------------")
print("1. Current Folder:", os.getcwd())
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)
print("--------------------------------------------------")

# 2. Initialize Supabase Client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
project_id: str = os.getenv("GOOGLE_CLOUD_PROJECT")
if not url or not key:
    print("⚠️ WARNING: Supabase URL or Key missing in .env")

supabase: Client = create_client(url, key)

# Share supabase client with route modules
dependencies.supabase = supabase

# 3. CORS & FastAPI Setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(patients_router)
app.include_router(questions_router)
app.include_router(checkin_router)
app.include_router(insights_router)
app.include_router(voice_router)
app.include_router(sensors_router)
app.include_router(voice_turns_router)

# 4. Database Connection (Your existing Postgres logic)
DB_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    if not DB_URL:
        raise Exception("DATABASE_URL not found")
    return psycopg2.connect(DB_URL, sslmode='require')

# 5. Vertex AI REST Setup (Existing)
PROJECT_ID = project_id 
# LOCATION = "us-central1"
LOCATION = "us-east1"
vertexai.init(project=PROJECT_ID, location=LOCATION)
try:
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    print(f"✅ Vertex AI Initialized for project: {PROJECT_ID}")
except Exception as e:
    print(f"⚠️ Vertex AI Setup Failed: {e}")


# =================================================================
#  NEW FEATURE: GEMINI LIVE API (WEBSOCKET PROXY)
# =================================================================

# Note: Using the 'v1beta1' endpoint which supports the Live API
GEMINI_HOST = f"{LOCATION}-aiplatform.googleapis.com"
GEMINI_URI = f"wss://{GEMINI_HOST}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent"
MODEL_ID = "gemini-live-2.5-flash-native-audio"  # Kept as 'exp' for Live API features

# Helper function to save logs to Supabase asynchronously
def log_to_supabase(log_data):
    try:
        # Ensure you have a 'conversation_analytics' table in Supabase
        supabase.table("conversation_analytics").insert(log_data).execute()
        logger.info(f"✅ Saved metric: {log_data.get('transcript', '')[:20]}...")
    except Exception as e:
        logger.error(f"❌ Supabase Error: {e}")

@app.websocket("/ws/chat")
async def websocket_endpoint(client_socket: WebSocket):
    await client_socket.accept()
    logger.info("📱 Client connected to WebSocket")

    # 1. Get Google Auth Token
    try:
        creds, _ = default()
        auth_req = GoogleRequest()
        creds.refresh(auth_req)
        bearer_token = creds.token
    except Exception as e:
        logger.error(f"❌ Auth failed: {e}")
        await client_socket.close(code=1008)
        return

    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json"
    }

    # 2. Connect to Gemini Live API
    try:
        async with websockets.connect(GEMINI_URI, additional_headers=headers) as gemini_socket:
            logger.info("🔗 Connected to Gemini Live API")

            # 3. Send Initial Setup
            # FIX: Keys must be camelCase for the raw WebSocket API
            setup_msg = {
                "setup": {
                    "model": f"projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}",
                    "generationConfig": { 
                        "responseModalities": ["AUDIO"], 
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": "Puck" 
                                }
                            }
                        }
                    }
                }
            }
            await gemini_socket.send(json.dumps(setup_msg))

            # State tracking
            state = {"user_started_speaking": 0}

            # --- LOOP A: Client -> Gemini ---
            async def client_to_gemini():
                try:
                    while True:
                        data = await client_socket.receive_text()
                        payload = json.loads(data)
                        
                        # Timestamp input for latency calculation
                        # Client must send keys as "realtimeInput" (camelCase)
                        if "realtimeInput" in payload:
                            state["user_started_speaking"] = time.time()
                        
                        await gemini_socket.send(data)
                except WebSocketDisconnect:
                    logger.info("Client disconnected")
                except Exception as e:
                    logger.error(f"Error C->G: {e}")

            # --- LOOP B: Gemini -> Client ---
            async def gemini_to_client():
                try:
                    async for message in gemini_socket:
                        response = json.loads(message)
                        
                        # 1. Analyze Response (Extract Text & Latency)
                        server_content = response.get("serverContent", {})
                        if "modelTurn" in server_content:
                            parts = server_content["modelTurn"].get("parts", [])
                            print(f"t(parts):")
                            for part in parts:
                                print(f"  t(part): {part}")
                                if "text" in part:
                                    text_content = part["text"]
                                    print(f"t(text_content): {text_content}")
                                    if text_content:
                                        # Calculate Latency
                                        now = time.time()
                                        latency_ms = int((now - state["user_started_speaking"]) * 1000) if state["user_started_speaking"] > 0 else 0
                                        word_count = len(text_content.split())
                                        
                                        # Prepare Data for Supabase
                                        log_data = {
                                            "transcript": text_content,
                                            "word_count": word_count,
                                            "latency_ms": latency_ms,
                                            # "created_at" handled by DB default usually
                                        }
                                        
                                        # Run DB insert in a separate thread
                                        asyncio.to_thread(log_to_supabase, log_data)

                        # 2. Forward to Phone
                        await client_socket.send_text(message)
                except Exception as e:
                    logger.error(f"Error G->C: {e}")

            # Run both loops
            await asyncio.gather(client_to_gemini(), gemini_to_client())

    except Exception as e:
        logger.error(f"Gemini Socket Error: {e}")
        await client_socket.close(code=1011)

# =================================================================
#  EXISTING REST ROUTES (Restored)
# =================================================================

class PromptRequest(BaseModel):
    prompt: str

@app.get("/")
def read_root():
    return {"status": "✅ Vertex AI Backend (HTTP + WebSocket) is Running!"}

@app.post("/chat")
def chat_with_vertex(request: PromptRequest):
    try:
        # Using specific model for REST chat as per your original code
        model = GenerativeModel("gemini-2.0-flash-lite-001") 
        response = model.generate_content(request.prompt)
        return {"reply": response.text}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/test-db")
def test_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT NOW();")
        t = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {"message": "Database Connected!", "server_time": t}
    except Exception as e:
        return {"error": str(e)}