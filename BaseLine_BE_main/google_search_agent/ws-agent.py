# # Copyright 2025 Google LLC
# # Licensed under the Apache License, Version 2.0.

# import os
# import json
# import asyncio
# import base64
# import warnings
# import logging
# import time
# from datetime import datetime
# from pathlib import Path

# # --- 1. Load Environment ---
# from dotenv import load_dotenv
# load_dotenv()

# # --- 2. Google GenAI & ADK Imports ---
# from google.genai.types import Part, Content, Blob
# from google.genai import types
# from google.adk.runners import InMemoryRunner
# from google.adk.agents import LiveRequestQueue
# from google.adk.agents.run_config import RunConfig

# from fastapi import FastAPI, WebSocket
# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse
# from starlette.websockets import WebSocketDisconnect

# from google_search_agent.agent import build_agent
# from routes.insights import _aggregate_weekly_data, _ask_gemini

# # Suppress warnings
# warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")
# warnings.filterwarnings("ignore", message="there are non-text parts in the response")

# logging.getLogger('google.genai').setLevel(logging.ERROR)
# logging.getLogger('google.adk').setLevel(logging.ERROR)

# APP_NAME = "ADK Streaming example"

# # --- Helper: Async Logging ---
# async def log_interaction(user_text, agent_text, user_id, timing_data):
#     """
#     Logs the conversation turn with accurate timestamps.
#     """
#     if not user_text and not agent_text:
#         return

#     def fmt(t):
#         return datetime.fromtimestamp(t).strftime('%H:%M:%S.%f')[:-3] if t else "N/A"

#     # Calculate Duration safely
#     user_duration = "0.00s"
#     if timing_data.get('user_start') and timing_data.get('user_end'):
#         user_duration = f"{timing_data['user_end'] - timing_data['user_start']:.2f}s"

#     agent_duration = "0.00s"
#     if timing_data.get('agent_start') and timing_data.get('agent_end'):
#         agent_duration = f"{timing_data['agent_end'] - timing_data['agent_start']:.2f}s"

#     print("\n" + "="*60)
#     print(f"📝 LOGGING TURN FOR USER: {user_id}")
#     print(f"⏱️  TIMING:")
#     print(f"    User Spoke:  {fmt(timing_data.get('user_start'))} -> {fmt(timing_data.get('user_end'))} ({user_duration})")
#     print(f"    Agent Spoke: {fmt(timing_data.get('agent_start'))} -> {fmt(timing_data.get('agent_end'))} ({agent_duration})")
#     print("-" * 60)
#     print(f"👤 USER INPUT:  {user_text}")
#     print(f"🤖 AGENT RESP:  {agent_text}")
#     print("="*60 + "\n")


# async def start_agent_session(user_id, is_audio=False, personalized_prompt=None):
#     """Starts an agent session with an optional personalized instruction."""

#     agent = build_agent(personalized_prompt)

#     runner = InMemoryRunner(
#         app_name=APP_NAME,
#         agent=agent,
#     )

#     session = await runner.session_service.create_session(
#         app_name=APP_NAME,
#         user_id=user_id,
#     )

#     if is_audio:
#         modalities = ["AUDIO"]
#         audio_config = types.AudioTranscriptionConfig()
#     else:
#         modalities = ["TEXT"]
#         audio_config = None

#     run_config = RunConfig(
#         response_modalities=modalities,
#         output_audio_transcription=audio_config,
#         input_audio_transcription=audio_config,
#     )

#     live_request_queue = LiveRequestQueue()
#     live_events = runner.run_live(
#         session=session,
#         live_request_queue=live_request_queue,
#         run_config=run_config,
#     )
#     return live_events, live_request_queue, session, runner


# async def agent_to_client_messaging(websocket, live_events, session, user_id, is_audio_mode, runner, session_state):
#     """Agent to client communication (matches source_code.py flow; detail agent removed)."""
#     full_input_transcript = ""
#     full_output_transcript = ""

#     async for event in live_events:
#         # Check for input transcription (transcript of user's audio speech)
#         if event.input_transcription:
#             if (event.partial):
#                 if hasattr(event.input_transcription, "text"):
#                     input_text = event.input_transcription.text
#                 else:
#                     input_text = str(event.input_transcription)

#             if input_text:
#                 # Timing is handled in client_to_agent_messaging (audio chunks),
#                 # NOT here — transcription events arrive after the user stopped speaking.
#                 if (not event.partial):
#                     # print("[Chuncks user input] ", input_text)
#                     full_input_transcript += input_text
#                 message = {
#                     "mime_type": "text/plain",
#                     "data": input_text,
#                     "partial": event.partial,
#                     "is_input_transcript": True,
#                 }
#                 await websocket.send_text(json.dumps(message))
#                 # print(f"[USER INPUT TRANSCRIPT]: {input_text}")

#         # Check for output transcription (transcript of agent's audio speech)
#         if event.output_transcription:
#             if (event.partial):
#                 if hasattr(event.output_transcription, "text"):
#                     transcript_text = event.output_transcription.text
#                 else:
#                     transcript_text = str(event.output_transcription)

#             if transcript_text:
#                 # Agent timing is handled via audio/pcm chunks below, not here.
#                 if (not event.partial):
#                     full_output_transcript += transcript_text

#                 message = {
#                     "mime_type": "text/plain",
#                     "data": transcript_text,
#                     "partial": event.partial,
#                     "is_output_transcript": True,
#                 }
#                 await websocket.send_text(json.dumps(message))
#                 # print(f"[AGENT OUTPUT TRANSCRIPT]: {transcript_text}")

#         # If the turn complete or interrupted
#         if event.turn_complete or event.interrupted:
#             message = {
#                 "turn_complete": event.turn_complete,
#                 "interrupted": event.interrupted,
#             }
#             await websocket.send_text(json.dumps(message))
#             # print(f"[AGENT TO CLIENT]: {message}")

#             # Keep your turn logger on successful completion
#             if event.turn_complete:
#                 await log_interaction(
#                     full_input_transcript,
#                     full_output_transcript,
#                     user_id,
#                     session_state,
#                 )

#                 # Reset turn buffers/timers
#                 full_input_transcript = ""
#                 full_output_transcript = ""
#                 session_state["user_start"] = None
#                 session_state["user_end"] = None
#                 session_state["agent_start"] = None
#                 session_state["agent_end"] = None

#             continue

#         # Read the Content and its first Part
#         part = event.content and event.content.parts and event.content.parts[0]
#         if not part:
#             continue

#         # If it's audio, send Base64 encoded audio data
#         is_audio = part.inline_data and part.inline_data.mime_type.startswith("audio/pcm")
#         if is_audio:
#             audio_data = part.inline_data and part.inline_data.data
#             if audio_data:
#                 # Track agent speaking time from actual audio chunks
#                 if session_state["agent_start"] is None:
#                     session_state["agent_start"] = time.time()
#                 session_state["agent_end"] = time.time()

#                 message = {
#                     "mime_type": "audio/pcm",
#                     "data": base64.b64encode(audio_data).decode("ascii"),
#                 }
#                 await websocket.send_text(json.dumps(message))
#                 print(f"[AGENT TO CLIENT]: audio/pcm: {len(audio_data)} bytes.")
#                 continue

#         # If it's text (partial or complete), send it
#         if part.text:
#             message = {
#                 "mime_type": "text/plain",
#                 "data": part.text,
#                 "partial": event.partial,
#                 "is_transcript": False,
#             }
#             await websocket.send_text(json.dumps(message))
#             print(f"[AGENT TO CLIENT]: text/plain: {part.text[:100]}...")


# async def client_to_agent_messaging(websocket, live_request_queue, session_state):
#     """Client to agent communication."""
#     try:
#         while True:
#             message_json = await websocket.receive_text()
#             message = json.loads(message_json)
#             mime_type = message["mime_type"]
#             data = message["data"]

#             if mime_type == "text/plain":
#                 content = Content(role="user", parts=[Part.from_text(text=data)])
#                 live_request_queue.send_content(content=content)
#                 # Manual start time for text mode (since no transcription event will fire)
#                 if session_state["user_start"] is None:
#                     session_state["user_start"] = time.time()
#                 session_state["user_end"] = time.time()
#                 print(f"[CLIENT TO AGENT]: {data}")
#             elif mime_type == "audio/pcm":
#                 # Track user speaking time from actual audio chunks
#                 if session_state["user_start"] is None:
#                     session_state["user_start"] = time.time()
#                 session_state["user_end"] = time.time()

#                 decoded_data = base64.b64decode(data)
#                 live_request_queue.send_realtime(Blob(data=decoded_data, mime_type=mime_type))
#             else:
#                 raise ValueError(f"Mime type not supported: {mime_type}")
#     except WebSocketDisconnect:
#         print("[CLIENT TO AGENT] WebSocket disconnected (normal)")
#     except Exception as e:
#         print(f"[CLIENT TO AGENT ERROR]: {e}")


# # --- 3. FastAPI App Setup ---

# app = FastAPI()

# BASE_DIR = Path(__file__).resolve().parent
# STATIC_DIR = BASE_DIR / "static"
# app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# @app.get("/")
# async def root():
#     """Serves the index.html"""
#     return FileResponse(STATIC_DIR / "index.html")

# @app.websocket("/ws/{user_id}")
# async def websocket_endpoint(websocket: WebSocket, user_id: str, is_audio: str = "false"):
#     """Client websocket endpoint"""

#     await websocket.accept()
#     print(f"Client #{user_id} connected, audio mode: {is_audio}")

#     is_audio_mode = (is_audio.lower() == "true")

#     # Fetch personalised agent prompt based on patient's recent check-ins
#     personalized_prompt = None
#     try:
#         patient_name, _, full_summary = _aggregate_weekly_data(int(user_id))
#         gemini_prompt = f"""You are a mental-health analytics assistant.
# Below is a patient's check-in data from the last week.

# {full_summary}

# Based on this data, return a JSON object (and nothing else) with exactly this key:
# - "agent_prompt": a system instruction string that will be injected into a voice agent's instructions (Google ADK Agent). This instruction should give the agent all the context it needs about the patient: their name, what their recent check-in data shows, specific patterns or concerns you noticed, and guidance on what topics to gently explore in conversation. Do NOT write a greeting or a message to the patient — write an instruction TO the agent so it knows the patient's context and can start a warm, informed, supportive conversation on its own."""
#         parsed = _ask_gemini(gemini_prompt)
#         personalized_prompt = parsed.get("agent_prompt", "")
#         print(f"✅ Loaded personalised prompt for user {user_id}")
#     except Exception as e:
#         print(f"⚠️ Could not load personalised prompt for user {user_id}: {e}")

#     session_state = {
#         "user_start": None,
#         "user_end": None,
#         "agent_start": None,
#         "agent_end": None,
#     }

#     live_events, live_request_queue, session, runner = await start_agent_session(user_id, is_audio_mode, personalized_prompt)

#     agent_to_client_task = asyncio.create_task(
#         agent_to_client_messaging(
#             websocket,
#             live_events,
#             session,
#             user_id,
#             is_audio_mode,
#             runner,
#             session_state,
#         )
#     )
#     client_to_agent_task = asyncio.create_task(
#         client_to_agent_messaging(websocket, live_request_queue, session_state)
#     )

#     try:
#         tasks = [agent_to_client_task, client_to_agent_task]
#         done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

#         for task in pending:
#             task.cancel()
#             try:
#                 await task
#             except asyncio.CancelledError:
#                 pass

#         for task in done:
#             try:
#                 task.result()
#             except WebSocketDisconnect:
#                 pass
#             except Exception as e:
#                 print(f"[WEBSOCKET ERROR] Task failed: {e}")
#     finally:
#         live_request_queue.close()
#         print(f"Client #{user_id} disconnected")