"""
Voice agent route — WebSocket /ws/voice/{user_id}

Uses Google ADK to run a personalised mental-health voice agent.
The agent instruction is dynamically generated from the patient's
recent check-in data via Gemini.
"""

import json
import asyncio
import base64
import time
import logging
import warnings
from datetime import datetime

from fastapi import APIRouter, WebSocket, HTTPException
from starlette.websockets import WebSocketDisconnect

from google.genai.types import Part, Content, Blob
from google.genai import types
from google.adk.runners import InMemoryRunner
from google.adk.agents import LiveRequestQueue
from google.adk.agents.run_config import RunConfig

from google_search_agent.agent import build_agent
from routes.insights import _aggregate_weekly_data, _ask_gemini
import dependencies

# Suppress noisy warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")
warnings.filterwarnings("ignore", message="there are non-text parts in the response")
logging.getLogger("google.genai").setLevel(logging.ERROR)
logging.getLogger("google.adk").setLevel(logging.ERROR)

logger = logging.getLogger("VoiceAgent")

router = APIRouter(tags=["voice"])

APP_NAME = "MentalHealthVoiceAgent"


# ═════════════════════════════════════════════════════════════════════
#  HELPERS
# ═════════════════════════════════════════════════════════════════════

async def _log_interaction(user_text, agent_text, user_id, timing_data):
    """Log a conversation turn with timestamps."""
    if not user_text and not agent_text:
        return

    def fmt(t):
        return datetime.fromtimestamp(t).strftime("%H:%M:%S.%f")[:-3] if t else "N/A"

    user_duration = "0.00s"
    if timing_data.get("user_start") and timing_data.get("user_end"):
        user_duration = f"{timing_data['user_end'] - timing_data['user_start']:.2f}s"

    agent_duration = "0.00s"
    if timing_data.get("agent_start") and timing_data.get("agent_end"):
        agent_duration = f"{timing_data['agent_end'] - timing_data['agent_start']:.2f}s"

    # Snapshot timing values so fire-and-forget task reads stable data
    snapshot = {
        "user_start": timing_data.get("user_start"),
        "user_end": timing_data.get("user_end"),
        "agent_start": timing_data.get("agent_start"),
        "agent_end": timing_data.get("agent_end"),
    }

    print("\n" + "=" * 60)
    print(f"📝 TURN — user {user_id}")
    print(f"   User:  {fmt(snapshot['user_start'])} → {fmt(snapshot['user_end'])} ({user_duration})")
    print(f"   Agent: {fmt(snapshot['agent_start'])} → {fmt(snapshot['agent_end'])} ({agent_duration})")
    print(f"   👤 {user_text}")
    print(f"   🤖 {agent_text}")
    print("=" * 60 + "\n")

    # ── Fire-and-forget DB save (does NOT block the conversation) ────
    async def _save_turn_to_db():
        try:
            user_duration_ms = None
            if snapshot["user_start"] and snapshot["user_end"]:
                user_duration_ms = int((snapshot["user_end"] - snapshot["user_start"]) * 1000)

            agent_duration_ms = None
            if snapshot["agent_start"] and snapshot["agent_end"]:
                agent_duration_ms = int((snapshot["agent_end"] - snapshot["agent_start"]) * 1000)

            row = {
                "user_id": int(user_id),
                "user_text": user_text or None,
                "agent_text": agent_text or None,
                "user_start": datetime.fromtimestamp(snapshot["user_start"]).isoformat() if snapshot["user_start"] else None,
                "user_end": datetime.fromtimestamp(snapshot["user_end"]).isoformat() if snapshot["user_end"] else None,
                "agent_start": datetime.fromtimestamp(snapshot["agent_start"]).isoformat() if snapshot["agent_start"] else None,
                "agent_end": datetime.fromtimestamp(snapshot["agent_end"]).isoformat() if snapshot["agent_end"] else None,
                "user_duration_ms": user_duration_ms,
                "agent_duration_ms": agent_duration_ms,
            }
            dependencies.supabase.table("voice_conversation_turns").insert(row).execute()
            logger.info(f"✅ Voice turn saved to DB for user {user_id}")
        except Exception as e:
            logger.error(f"❌ Failed to save voice turn to DB: {e}")

    asyncio.create_task(_save_turn_to_db())


def _fetch_personalized_prompt(user_id: int) -> str | None:
    """
    Build a personalised agent instruction from the patient's recent
    check-in data.  Returns None if anything fails (no sessions, etc.).
    """
    try:
        _patient_name, _, full_summary = _aggregate_weekly_data(user_id)
        gemini_prompt = f"""You are a mental-health analytics assistant.
Below is a patient's check-in data from the last week.

{full_summary}

Based on this data, return a JSON object (and nothing else) with exactly this key:
- "agent_prompt": a system instruction string that will be injected into a voice agent's instructions (Google ADK Agent). This instruction should give the agent all the context it needs about the patient: their name, what their recent check-in data shows, specific patterns or concerns you noticed, and guidance on what topics to gently explore in conversation. Do NOT write a greeting or a message to the patient — write an instruction TO the agent so it knows the patient's context and can start a warm, informed, supportive conversation on its own."""
        parsed = _ask_gemini(gemini_prompt)
        prompt = parsed.get("agent_prompt", "")
        logger.info(f"✅ Personalised prompt loaded for user {user_id}")
        return prompt
    except Exception as e:
        logger.warning(f"⚠️ Could not load prompt for user {user_id}: {e}")
        return None


async def _start_agent_session(user_id, is_audio=False, personalized_prompt=None):
    """Create an ADK agent + runner + live session."""
    agent = build_agent(personalized_prompt)

    runner = InMemoryRunner(app_name=APP_NAME, agent=agent)

    session = await runner.session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
    )

    if is_audio:
        modalities = ["AUDIO"]
        audio_config = types.AudioTranscriptionConfig()
    else:
        modalities = ["TEXT"]
        audio_config = None

    run_config = RunConfig(
        response_modalities=modalities,
        output_audio_transcription=audio_config,
        input_audio_transcription=audio_config,
    )

    live_request_queue = LiveRequestQueue()
    live_events = runner.run_live(
        session=session,
        live_request_queue=live_request_queue,
        run_config=run_config,
    )
    return live_events, live_request_queue, session, runner


# ═════════════════════════════════════════════════════════════════════
#  MESSAGE LOOPS
# ═════════════════════════════════════════════════════════════════════

async def _agent_to_client(websocket, live_events, session, user_id, is_audio_mode, runner, session_state):
    """Forward agent events to the client WebSocket."""
    full_input_transcript = ""
    full_output_transcript = ""

    async for event in live_events:
        # --- Input transcription ---
        if event.input_transcription:
            input_text = (
                event.input_transcription.text
                if hasattr(event.input_transcription, "text")
                else str(event.input_transcription)
            )
            if input_text:
                if not event.partial:
                    full_input_transcript += input_text
                await websocket.send_text(json.dumps({
                    "mime_type": "text/plain",
                    "data": input_text,
                    "partial": event.partial,
                    "is_input_transcript": True,
                }))

        # --- Output transcription ---
        if event.output_transcription:
            transcript_text = (
                event.output_transcription.text
                if hasattr(event.output_transcription, "text")
                else str(event.output_transcription)
            )
            if transcript_text:
                if not event.partial:
                    full_output_transcript += transcript_text
                await websocket.send_text(json.dumps({
                    "mime_type": "text/plain",
                    "data": transcript_text,
                    "partial": event.partial,
                    "is_output_transcript": True,
                }))

        # --- Turn complete / interrupted ---
        if event.turn_complete or event.interrupted:
            await websocket.send_text(json.dumps({
                "turn_complete": event.turn_complete,
                "interrupted": event.interrupted,
            }))
            if event.turn_complete:
                await _log_interaction(
                    full_input_transcript,
                    full_output_transcript,
                    user_id,
                    session_state,
                )
                full_input_transcript = ""
                full_output_transcript = ""
                session_state.update(user_start=None, user_end=None, agent_start=None, agent_end=None)
            continue

        # --- Content parts ---
        part = event.content and event.content.parts and event.content.parts[0]
        if not part:
            continue

        # Audio
        is_audio = part.inline_data and part.inline_data.mime_type.startswith("audio/pcm")
        if is_audio:
            audio_data = part.inline_data and part.inline_data.data
            if audio_data:
                if session_state["agent_start"] is None:
                    session_state["agent_start"] = time.time()
                session_state["agent_end"] = time.time()
                await websocket.send_text(json.dumps({
                    "mime_type": "audio/pcm",
                    "data": base64.b64encode(audio_data).decode("ascii"),
                }))
                continue

        # Text
        if part.text:
            await websocket.send_text(json.dumps({
                "mime_type": "text/plain",
                "data": part.text,
                "partial": event.partial,
                "is_transcript": False,
            }))


async def _client_to_agent(websocket, live_request_queue, session_state):
    """Forward client messages to the ADK agent."""
    logger.info("Listening for client messages...")
    try:
        while True:
            try:
                # 1. Wait for message
                raw = await websocket.receive_text()
                
                # 2. Parse JSON
                msg = json.loads(raw)
                mime_type = msg.get("mime_type") # Use .get() to be safe
                data = msg.get("data")

                # 3. Process
                if mime_type == "text/plain":
                    content = Content(role="user", parts=[Part.from_text(text=data)])
                    live_request_queue.send_content(content=content)
                    if session_state["user_start"] is None:
                        session_state["user_start"] = time.time()
                    session_state["user_end"] = time.time()

                elif mime_type == "audio/pcm":
                    if session_state["user_start"] is None:
                        session_state["user_start"] = time.time()
                    session_state["user_end"] = time.time()
                    
                    decoded = base64.b64decode(data)
                    
                    # --- NEW CODE: Strip the WAV header ---
                    # A standard WAV file header is 44 bytes and starts with 'RIFF'
                    if decoded.startswith(b'RIFF'):
                        decoded = decoded[44:]
                    # --------------------------------------
                    
                    live_request_queue.send_realtime(Blob(data=decoded, mime_type=mime_type))
                
                else:
                    logger.warning(f"Unsupported mime type: {mime_type}")
            except WebSocketDisconnect:
                logger.info("Client disconnected (normal)")
                break  # <-- You already have this, which is good!
            except json.JSONDecodeError:
                logger.error("Failed to parse JSON from client")
            except KeyError as e:
                logger.error(f"Missing key in client message: {e}")
            except RuntimeError as e:
                # Catch the specific Starlette disconnect error and break
                if "Cannot call \"receive\"" in str(e):
                    logger.info("Client disconnected abruptly (RuntimeError)")
                    break

    except WebSocketDisconnect:
        logger.info("Client disconnected (normal)")
    except Exception as e:
        # This catches errors with the WebSocket connection itself (fatal)
        logger.error(f"Fatal client→agent error: {e}")


# ═════════════════════════════════════════════════════════════════════
#  TEST ENDPOINTS
# ═════════════════════════════════════════════════════════════════════

@router.get("/voice/health")
def voice_health():
    """Quick check that the voice agent can be instantiated."""
    try:
        agent = build_agent("Test instruction")
        return {"status": "ok", "agent_name": agent.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/test/{user_id}")
async def test_voice_agent(user_id: int):
    """
    Text-only test — no WebSocket needed.
    Uses the same Vertex AI GenerativeModel that /insights uses (known working).
    Builds the personalised prompt, sends a kick-off, returns the greeting.
    Call from Swagger UI at /docs.
    """
    from vertexai.generative_models import GenerativeModel

    # 1. Build personalised prompt
    personalized_prompt = _fetch_personalized_prompt(user_id)

    # 2. Combine base + personalised instruction (same logic as build_agent)
    from google_search_agent.agent import BASE_INSTRUCTION
    if personalized_prompt:
        system_instruction = f"{BASE_INSTRUCTION}\n\n{personalized_prompt}"
    else:
        system_instruction = BASE_INSTRUCTION

    # 3. Use the proven Vertex AI REST path (same as /insights)
    model = GenerativeModel(
        "gemini-2.0-flash-lite-001",
        system_instruction=[system_instruction],
    )

    kick_off_text = (
        "[SYSTEM] The voice session just started. "
        "Greet the patient warmly by name and begin the conversation "
        "based on your instructions. Keep it brief and natural — "
        "one or two sentences max."
    )

    response = model.generate_content(kick_off_text)
    greeting = response.text if response.text else "(no response)"

    return {
        "status": "ok",
        "user_id": user_id,
        "personalized_prompt_preview": (personalized_prompt or "")[:200] + "..." if personalized_prompt and len(personalized_prompt) > 200 else personalized_prompt,
        "agent_greeting": greeting,
    }


# ═════════════════════════════════════════════════════════════════════
#  WEBSOCKET ENDPOINT
# ═════════════════════════════════════════════════════════════════════

@router.websocket("/ws/voice/{user_id}")
async def voice_websocket(websocket: WebSocket, user_id: str, is_audio: str = "true"):
    """
    WebSocket endpoint for the ADK voice agent.
    Connect with:  ws://<host>/ws/voice/2?is_audio=true
    """
    print(f"Incoming voice WebSocket connection: user_id={user_id}, is_audio={is_audio}")
    await websocket.accept()
    logger.info(f"📱 Voice client #{user_id} connected (audio={is_audio})")

    is_audio_mode = is_audio.lower() == "true"

    # Build personalised instruction   
    personalized_prompt = _fetch_personalized_prompt(int(user_id))
    print(f"Personalized prompt for user {user_id}:\n{personalized_prompt}\n")
    session_state = {
        "user_start": None,
        "user_end": None,
        "agent_start": None,
        "agent_end": None,
    }

    live_events, live_request_queue, session, runner = await _start_agent_session(
        user_id, is_audio_mode, personalized_prompt
    )

    # Send a hidden kick-off message so the agent speaks first
    # The user never sees this — they just hear the agent greet them
    kick_off = Content(
        role="user",
        parts=[Part.from_text(
            text="[SYSTEM] The voice session just started. "
            "Greet the patient warmly by name and begin the conversation "
            "based on your instructions. Keep it brief and natural — "
            "one or two sentences max."
        )],
    )
    live_request_queue.send_content(content=kick_off)

    agent_task = asyncio.create_task(
        _agent_to_client(websocket, live_events, session, user_id, is_audio_mode, runner, session_state)
    )
    client_task = asyncio.create_task(
        _client_to_agent(websocket, live_request_queue, session_state)
    )

    try:
        done, pending = await asyncio.wait(
            [agent_task, client_task], return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        for task in done:
            try:
                task.result()
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"Task error: {e}")
    finally:
        live_request_queue.close()
        logger.info(f"Voice client #{user_id} disconnected")
