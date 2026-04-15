================================================================================
                          MENTAL HEALTH BACKEND
================================================================================

A FastAPI backend server for a mental-health mobile application that supports
daily check-ins, AI-generated insights, real-time voice therapy sessions
powered by Google Gemini, and passive sensor data collection from patient
devices.


================================================================================
TABLE OF CONTENTS
================================================================================

  1.  Overview
  2.  Architecture
  3.  Tech Stack
  4.  Project Structure
  5.  Database Schema
  6.  API Reference
        6.1   Authentication
        6.2   Users
        6.3   Patient Management
        6.4   Questions
        6.5   Check-in
        6.6   Insights & Agent Prompt
        6.7   Voice Agent
        6.8   Voice Conversation Turns
        6.9   Sensors
        6.10  Legacy Chat & Utility
  7.  Voice Agent Deep-Dive
  8.  Insights Generation Pipeline
  9.  Sensor Data Pipeline
  10. Setup & Installation
  11. Environment Variables
  12. Running Locally
  13. Deployment
  14. Testing


================================================================================
1. OVERVIEW
================================================================================

This backend serves as the API layer for a mental-health monitoring and support
system. The application targets two main user roles:

  - PATIENTS -- Complete daily mental-health check-ins, receive AI-generated
    insights on their dashboard, and engage in real-time voice therapy
    conversations with a personalised AI agent.

  - DOCTORS -- Are linked to patients and can monitor check-in data.

Key Capabilities:
```text
  +----------------------+--------------------------------------------------------------+
| Capability           | Description                                                  |
+----------------------+--------------------------------------------------------------+
| Daily Check-ins      | Structured questionnaires (sliders, multiple-choice,         |
|                      | boolean, free-text) stored per session                       |
+----------------------+--------------------------------------------------------------+
| AI Insights          | Gemini analyzes the last 7 days of check-in data and         |
|                      | generates warm, patient-facing insights                      |
+----------------------+--------------------------------------------------------------+
| Real-time Voice Agent| A WebSocket-based voice therapy session using Google ADK     |
|                      | with Gemini Live native audio, personalized per patient      |
+----------------------+--------------------------------------------------------------+
| Sensor Collection    | Passive collection of GPS, Wi-Fi, battery, and app-session   |
|                      | data from patient devices                                    |
+----------------------+--------------------------------------------------------------+
| Provider Linking     | Patients are linked to a doctor and a caregiver              |
+----------------------+--------------------------------------------------------------+


================================================================================
2. ARCHITECTURE
================================================================================

  +--------------------+       HTTPS / WSS       +------------------------+
  |                    | <---------------------> |                        |
  |   React Native     |     REST + WebSocket    |   FastAPI Backend      |
  |   Mobile App       |                         |   (this repository)    |
  |                    |                         |                        |
  +--------------------+                         +------+-------+---------+
                                                        |       |
                                         +--------------+       +--------------+
                                         v                                     v
                                +-----------------+                +---------------------+
                                |   Supabase      |                |  Google Cloud        |
                                |   (PostgreSQL)  |                |                     |
                                |                 |                |  - Vertex AI        |
                                |  - Users        |                |    (Gemini models)  |
                                |  - Check-ins    |                |                     |
                                |  - Sensors      |                |  - Google ADK       |
                                |  - Voice turns  |                |    (Live voice)     |
                                |  - Questions    |                |                     |
                                +-----------------+                +---------------------+

Data flow for a voice session:

  1. Client connects via WebSocket to /ws/voice/{user_id}
  2. Server fetches the patient's last 7 days of check-in data from Supabase
  3. Gemini generates a personalised system instruction for the voice agent
  4. An ADK Agent is instantiated with that instruction and Gemini Live native
     audio
  5. Bidirectional audio streams flow:
     Client <-> FastAPI <-> ADK Runner <-> Gemini Live API
  6. Each conversation turn (user text + agent text + timing) is logged to
     voice_conversation_turns


================================================================================
3. TECH STACK
================================================================================

  +---------------------+------------------------------------------------------+
  | Technology          | Role                                                 |
  +---------------------+------------------------------------------------------+
  | FastAPI             | HTTP + WebSocket server framework                    |
  | Supabase            | PostgreSQL database accessed via REST client          |
  |                     | (supabase-py)                                        |
  | Google Vertex AI    | Gemini 2.0-flash-lite-001 for text-based insights    |
  | Google ADK          | Agent Development Kit -- orchestrates the live voice  |
  |                     | agent                                                |
  | Gemini Live API     | gemini-live-2.5-flash-native-audio for real-time     |
  |                     | bidirectional audio                                  |
  | Pydantic            | Request/response schema validation                   |
  | psycopg2            | Direct PostgreSQL connectivity (test endpoint)       |
  | Docker              | Container image for Cloud Run deployment             |
  | Google Cloud Run    | Serverless production hosting                        |
  +---------------------+------------------------------------------------------+


================================================================================
4. PROJECT STRUCTURE
================================================================================

  MentalHealthBackend/
  |
  |-- main.py                          App entrypoint -- FastAPI init, CORS,
  |                                    router registration, Vertex AI setup,
  |                                    legacy Gemini WebSocket proxy
  |
  |-- dependencies.py                  Shared Supabase client singleton
  |-- requirements.txt                 Python dependencies
  |-- Dockerfile                       Cloud Run container definition
  |
  |-- google_search_agent/
  |   |-- __init__.py
  |   |-- agent.py                     ADK Agent builder -- BASE_INSTRUCTION
  |   |                                + personalised prompt
  |   |-- ws-agent.py                  Standalone WebSocket agent (dev utility)
  |
  |-- routes/
  |   |-- __init__.py
  |   |-- schemas.py                   All Pydantic request/response models
  |   |                                (35+ schemas)
  |   |-- auth.py                      POST /auth/login
  |   |-- users.py                     POST /users, GET /users
  |   |-- patients.py                  Patient profile, dashboard, provider-link
  |   |-- questions.py                 GET /questions -- structured questionnaire
  |   |-- checkin.py                   POST /checkin/submit -- daily check-in
  |   |-- insights.py                  GET /insights/{user_id},
  |   |                                GET /agent-prompt/{user_id}
  |   |-- voice.py                     WS /ws/voice/{user_id} -- ADK voice agent
  |   |-- voice_turns.py               POST /voice-turns,
  |   |                                GET /voice-turns/{user_id}
  |   |-- sensors.py                   POST /sensors/batch,
  |                                    GET /sensors/types,
  |                                    GET /sensors/{user_id}
  |
  |-- static/                          Browser-based audio test utilities
  |   |-- audio-player.js              PCM audio playback handler
  |   |-- audio-recorder.js            PCM audio capture handler
  |   |-- pcm-player-processor.js      Web Audio API worklet -- playback
  |   |-- pcm-recorder-processor.js    Web Audio API worklet -- recording
  |
  |-- test_client.py                   WebSocket test client (basic)
  |-- test_full_client.py              WebSocket test client (full flow)


================================================================================
5. DATABASE SCHEMA
================================================================================

The application uses Supabase (hosted PostgreSQL). Below are all tables
referenced by the backend.

--- User & Role Tables ---

  users
    Core user table -- id, username, email, password_hash,
    role (PATIENT / DOCTOR / ADMIN), is_active

  patient_details
    Extended patient profile -- user_id (FK), full_name, birth_date,
    checkin_time

  doctor_details
    Doctor profile -- user_id (FK), full_name, phone_number

  caregivers
    Caregiver records -- id, full_name, phone_number, relationship

  patient_provider_link
    Links a patient to a doctor and a caregiver -- patient_id, doctor_id,
    caregiver_id (unique on patient_id)

--- Check-in Tables ---

  questions
    Question definitions -- id, text, type (SLIDER / CHOICE / TEXT / BOOLEAN)

  characteristics
    Mental-health characteristics (e.g., anxiety, mood) -- id, name

  question_characteristics
    Many-to-many junction -- question_id, characteristic_id, sort_order

  slider_config
    Slider parameters -- question_id, min_value, max_value, step

  choice_options
    Multiple-choice options -- id, question_id, label, value, sort_order

  checkin_sessions
    One row per patient per day -- id, patient_user_id, session_date
    (unique constraint)

  responses
    Individual answers -- session_id (FK), question_id, numeric_value,
    option_id, text_value

--- Voice Conversation Tables ---

  voice_conversation_turns
    Each conversation turn -- id, user_id, user_text, agent_text, user_start,
    user_end, agent_start, agent_end, user_duration_ms, agent_duration_ms,
    created_at

  conversation_analytics
    Legacy analytics from the raw Gemini WebSocket proxy -- transcript,
    word_count, latency_ms

--- Sensor Tables ---

  sensor_types
    Lookup table -- id, name (gps, wifi, wifi_location, phonecharge,
    phonecharge_period, app_sessions)

  sensor_uploads
    One record per batch upload -- id, user_id, uploaded_at

  sensor_gps
    GPS readings -- upload_id, ts, latitude, longitude, accuracy, altitude,
    speed, heading, source, window_start, window_end

  sensor_wifi
    Wi-Fi scan results -- upload_id, ts, bssid, frequency, signal_level,
    scan_id

  sensor_wifi_location
    Inferred Wi-Fi location -- upload_id, ts, label, confidence,
    matched_bssids

  sensor_phonecharge
    Battery snapshots -- upload_id, ts, battery_level, battery_state,
    power_mode

  sensor_phonecharge_period
    Charge/discharge periods -- upload_id, start_ts, end_ts, state,
    start_level, end_level

  sensor_app_sessions
    App foreground/background sessions -- upload_id, start_ts, end_ts, state

--- Entity Relationship Overview ---

  users ------+---> patient_details
              +---> doctor_details
              +---> patient_provider_link ---> caregivers

  users ---> checkin_sessions ---> responses ---> questions
                                                    +---> question_characteristics ---> characteristics
                                                    +---> slider_config
                                                    +---> choice_options

  users ---> sensor_uploads ---+---> sensor_gps
                               +---> sensor_wifi
                               +---> sensor_wifi_location
                               +---> sensor_phonecharge
                               +---> sensor_phonecharge_period
                               +---> sensor_app_sessions

  users ---> voice_conversation_turns


================================================================================
6. API REFERENCE
================================================================================

All routes are registered in main.py and served from /. Interactive
documentation is available at /docs (Swagger UI) when the server is running.


--- 6.1 Authentication ---

  POST /auth/login      Authenticate with username + password

  Request body (LoginRequest):
    {
      "username": "john_doe",
      "password": "secret123"
    }

  Response (LoginResponse):
    {
      "user_id": 1,
      "role": "PATIENT",
      "username": "john_doe"
    }

  Password verification uses SHA-256 hashing against the stored password_hash.


--- 6.2 Users ---

  POST /users           Create a new user (PATIENT / DOCTOR / ADMIN)
  GET  /users           List all users

  Create user request (CreateUserRequest):
    {
      "username": "jane_doe",
      "email": "jane@example.com",
      "password": "mypassword",
      "role": "PATIENT"
    }

  Response (UserResponse):
    {
      "id": 2,
      "role": "PATIENT",
      "username": "jane_doe",
      "email": "jane@example.com",
      "is_active": true
    }


--- 6.3 Patient Management ---

  POST /patient/details                   Create or update patient profile
                                          (upsert on user_id)
  GET  /patient/dashboard/{user_id}       Patient dashboard -- name, birth
                                          date, streak count, next check-in
  GET  /patient/provider-link/{user_id}   Get linked doctor & caregiver info
  POST /patient/provider-link             Create caregiver record and link
                                          patient to doctor + caregiver

  Dashboard response (PatientDashboardResponse):
    {
      "full_name": "Jane Doe",
      "birth_date": "1998-05-15",
      "streak_count": 5,
      "next_checkin": "09:00"
    }

  The streak is calculated as the number of consecutive days (ending at today)
  for which a check-in session exists.

  Provider link request (CreateProviderLinkRequest):
    {
      "patient_id": 2,
      "doctor_id": 3,
      "caregiver": {
        "name": "Bob Smith",
        "phone": "+972501234567",
        "relation": "Father"
      }
    }


--- 6.4 Questions ---

  GET /questions        Return all check-in questions with nested slider/choice
                        configs and associated characteristics

  Response -- array of QuestionResponse:
    [
      {
        "id": 1,
        "characteristics": [{ "id": 1, "name": "Mood" }],
        "text": "How would you rate your mood today?",
        "type": "SLIDER",
        "sort_order": 1,
        "slider_config": { "min_value": 1, "max_value": 10, "step": 1 },
        "choice_options": null
      },
      {
        "id": 2,
        "characteristics": [{ "id": 2, "name": "Sleep" }],
        "text": "How well did you sleep last night?",
        "type": "CHOICE",
        "sort_order": 2,
        "slider_config": null,
        "choice_options": [
          { "id": 1, "label": "Very poorly", "value": 1, "sort_order": 1 },
          { "id": 2, "label": "Poorly", "value": 2, "sort_order": 2 },
          { "id": 3, "label": "OK", "value": 3, "sort_order": 3 },
          { "id": 4, "label": "Well", "value": 4, "sort_order": 4 },
          { "id": 5, "label": "Very well", "value": 5, "sort_order": 5 }
        ]
      }
    ]

  The server performs a multi-table join across question_characteristics,
  questions, characteristics, slider_config, and choice_options to build this
  nested response.


--- 6.5 Check-in ---

  POST /checkin/submit   Submit a daily check-in session with answers

  Request (CheckinSubmitRequest):
    {
      "patient_user_id": 2,
      "session_date": "2026-03-16",
      "answers": [
        { "question_id": 1, "numeric_value": 7 },
        { "question_id": 2, "option_id": 4 },
        { "question_id": 3, "text_value": "Feeling better today" }
      ]
    }

  Response (CheckinSubmitResponse):
    {
      "session_id": 42,
      "responses_saved": 3
    }

  - Enforces one session per patient per date via a database unique constraint
    (returns 409 Conflict if duplicate).
  - If response insertion fails, the session record is cleaned up (rolled back).


--- 6.6 Insights & Agent Prompt ---

  GET /insights/{user_id}       Generate 2 warm, patient-facing insights from
                                the last 7 days of check-ins
  GET /agent-prompt/{user_id}   Generate a personalised system instruction for
                                the voice agent

  Insights response (InsightsResponse):
    {
      "patient_name": "Jane Doe",
      "sessions": [
        {
          "session_date": "2026-03-15",
          "answers": [
            { "question": "How would you rate your mood today?", "answer": "7" },
            { "question": "How well did you sleep last night?", "answer": "Well" }
          ]
        }
      ],
      "insights": [
        "Your mood has been steadily improving this week -- great progress!",
        "Your sleep quality has been consistent, which is a strong foundation."
      ]
    }

  Agent prompt response (AgentPromptResponse):
    {
      "patient_name": "Jane Doe",
      "agent_prompt": "The patient is Jane Doe. Her mood scores have ranged
        from 5 to 7 this week, showing an upward trend. Sleep has been
        consistent at 'Well'. Gently explore what positive changes she's made
        and whether she's noticed any connection between sleep and mood..."
    }

  Both endpoints share the same data aggregation pipeline (see Section 8).


--- 6.7 Voice Agent ---

  WS   /ws/voice/{user_id}?is_audio=true   Real-time bidirectional voice
                                            agent session
  GET  /voice/health                        Health check -- verifies the ADK
                                            agent can be instantiated
  POST /voice/test/{user_id}                Text-only test -- builds
                                            personalised prompt, returns
                                            greeting (no WebSocket needed)

  WebSocket Protocol:

  Client -> Server messages (JSON):

    Audio:  { "mime_type": "audio/pcm", "data": "<base64 PCM audio>" }
    Text:   { "mime_type": "text/plain", "data": "Hello, how are you?" }

  Server -> Client messages (JSON):

    +-------------------------------------+-----------------------------------+
    | Field                               | Description                       |
    +-------------------------------------+-----------------------------------+
    | mime_type: "audio/pcm" + data       | Agent audio response (base64 PCM) |
    | mime_type: "text/plain" + data      | Transcription of user's speech    |
    |   + is_input_transcript: true       |                                   |
    | mime_type: "text/plain" + data      | Transcription of agent's speech   |
    |   + is_output_transcript: true      |                                   |
    | turn_complete: true                 | Agent finished its turn           |
    | interrupted: true                   | User interrupted the agent        |
    +-------------------------------------+-----------------------------------+


--- 6.8 Voice Conversation Turns ---

  POST /voice-turns            Manually store a conversation turn with timing
  GET  /voice-turns/{user_id}  Retrieve all turns for a user (newest first)

  Request (VoiceTurnRequest):
    {
      "user_id": 2,
      "user_text": "I've been feeling anxious lately",
      "agent_text": "I hear you. Can you tell me more about when the anxiety
        tends to come up?",
      "user_start": "2026-03-16T10:00:00",
      "user_end": "2026-03-16T10:00:03",
      "agent_start": "2026-03-16T10:00:03",
      "agent_end": "2026-03-16T10:00:08"
    }

  Durations in milliseconds are calculated automatically from the start/end
  timestamps.

  Note: During a live WebSocket voice session, turns are logged automatically
  by the server. This REST endpoint is available for manual/external logging.


--- 6.9 Sensors ---

  GET  /sensors/types          List all supported sensor types
  POST /sensors/batch          Upload a batch of mixed sensor readings
  GET  /sensors/{user_id}      Retrieve all sensor data for a user by type

  Supported sensor types:
    gps, wifi, wifi_location, phonecharge, phonecharge_period, app_sessions

  Batch upload request (SensorBatchRequest):
    {
      "userId": 2,
      "deviceTime": "2026-03-16T10:30:00Z",
      "sensors": [
        {
          "type": "gps",
          "ts": "2026-03-16T10:30:00Z",
          "latitude": 32.0853,
          "longitude": 34.7818,
          "accuracy": 10.5
        },
        {
          "type": "phonecharge",
          "ts": "2026-03-16T10:30:00Z",
          "batteryLevel": 0.85,
          "batteryState": "unplugged"
        }
      ]
    }

  Response (SensorBatchResponse):
    {
      "upload_id": 15,
      "user_id": 2,
      "inserted": { "gps": 1, "phonecharge": 1 },
      "total": 2
    }

  The batch endpoint:
    1. Validates all sensor types against the sensor_types lookup table
    2. Creates a single sensor_uploads parent record
    3. Distributes readings into the appropriate per-type table
    4. If insertion fails, the upload record is cleaned up

  Sensor Types Detail:

    +---------------------+-----------------------------------------------+
    | Type                | Data Captured                                 |
    +---------------------+-----------------------------------------------+
    | gps                 | Latitude, longitude, accuracy, altitude,      |
    |                     | speed, heading                                |
    | wifi                | BSSID, frequency, signal level, scan ID       |
    | wifi_location       | Inferred location label, confidence,          |
    |                     | matched BSSIDs                                |
    | phonecharge         | Battery level, state (charging/unplugged),    |
    |                     | power mode                                    |
    | phonecharge_period  | Charge/discharge periods with start/end       |
    |                     | levels                                        |
    | app_sessions        | Foreground/background app usage periods       |
    +---------------------+-----------------------------------------------+


--- 6.10 Legacy Chat & Utility ---

  WS   /ws/chat       Legacy Gemini Live WebSocket proxy (raw audio, no ADK)
  POST /chat          Simple text prompt -> Gemini response
  GET  /              Health check -- returns server status
  GET  /test-db       Test direct PostgreSQL connectivity


================================================================================
7. VOICE AGENT DEEP-DIVE
================================================================================

The voice agent is the core feature of the application. Here is how the system
works end-to-end:

--- 7.1 Agent Construction (google_search_agent/agent.py) ---

The agent is built using the Google Agent Development Kit (ADK):

  Agent(
      name="mental_health_agent",
      model="gemini-live-2.5-flash-native-audio",
      instruction=BASE_INSTRUCTION + personalised_context,
      tools=[google_search],
  )

  - Base instruction: A fixed prompt establishing the agent's role as a
    supportive mental-health voice agent -- warm, empathetic, concise.
  - Personalised context: Dynamically generated per session from the patient's
    check-in data.
  - Tools: The agent has access to google_search for looking up relevant
    information during conversation.

--- 7.2 Personalisation Pipeline ---

When a WebSocket connection opens:

  1. _fetch_personalized_prompt(user_id) is called
  2. This calls _aggregate_weekly_data() which fetches the last 7 days of
     check-in sessions + responses from Supabase
  3. Answers are resolved to human-readable text (slider values, choice labels,
     boolean Yes/No, free text)
  4. The full summary is sent to Gemini 2.0 Flash Lite with a meta-prompt
     asking it to generate a system instruction for the voice agent
  5. The resulting instruction contains: patient name, data patterns, concerns,
     and guidance on what topics to explore

--- 7.3 Session Lifecycle ---

  Client connects to /ws/voice/{user_id}
          |
          v
  Server builds personalised Agent
          |
          v
  InMemoryRunner + LiveRequestQueue created
          |
          v
  Kick-off message sent -> Agent greets patient by name
          |
          v
  Two concurrent async tasks:
    +-- client_to_agent: forwards audio/text from client -> ADK queue
    +-- agent_to_client: forwards ADK events -> client WebSocket
          |
          v
  On turn_complete -> log turn to voice_conversation_turns (fire-and-forget)
          |
          v
  On disconnect -> cancel tasks, close queue

--- 7.4 Audio Format ---

  - Codec:    Raw PCM (Pulse Code Modulation)
  - Transport: Base64-encoded in JSON over WebSocket
  - WAV header stripping: The server automatically strips 44-byte WAV headers
    if present in incoming audio
  - The static/ directory contains Web Audio API worklet processors for
    browser-based testing of the audio pipeline


================================================================================
8. INSIGHTS GENERATION PIPELINE
================================================================================

Both /insights/{user_id} and /agent-prompt/{user_id} share the same data
aggregation logic:

  patient_details     checkin_sessions     responses     questions
  (full_name)         (last 7 days)                      + choices + sliders
       |                    |                  |                |
       v                    v                  v                v
  +--------------------------------------------------------------------+
  |                   _aggregate_weekly_data()                          |
  |  Joins sessions -> responses -> questions -> resolves human-        |
  |  readable answers (slider values, choice labels, Yes/No, text)     |
  +--------------------------------------------------------------------+
                              |
                              v
                    Full text summary string:
                    "Patient: Jane Doe
                     Session on 2026-03-15:
                       - How is your mood?: 7
                       - Sleep quality?: Well"
                              |
               +--------------+--------------+
               v                             v
       /insights/{user_id}          /agent-prompt/{user_id}
       Prompt: "Return 2            Prompt: "Return a system
       insights TO the              instruction FOR the
       patient..."                  voice agent..."
               |                             |
               v                             v
        Gemini 2.0 Flash            Gemini 2.0 Flash
               |                             |
               v                             v
       ["insight1", "insight2"]     "agent_prompt string"


================================================================================
9. SENSOR DATA PIPELINE
================================================================================

The mobile app collects passive sensor data and uploads it in batches:

  Mobile Device                  Backend                       Supabase
  -------------                  -------                       --------
  Collect GPS, Wi-Fi,            POST /sensors/batch
  battery, app sessions  ------> |
                                 +-- Validate types against sensor_types table
                                 +-- Create sensor_uploads record
                                 +-- Bucket readings by type
                                 +-- Insert into sensor_gps, sensor_wifi, etc.
                                 +-- Return summary


================================================================================
10. SETUP & INSTALLATION
================================================================================

Prerequisites:

  - Python 3.10+
  - Google Cloud SDK (gcloud) authenticated with a project that has Vertex AI
    enabled
  - A Supabase project with the database schema set up
  - A .env file with the required environment variables

Installation:

  # 1. Clone the repository
  git clone https://github.com/Dorivanirtau/MentalHealthBE.git
  cd MentalHealthBE

  # 2. Create a virtual environment
  python -m venv venv
  source venv/bin/activate

  # 3. Install dependencies
  pip install -r requirements.txt

  # 4. Authenticate with Google Cloud
  gcloud auth application-default login
  gcloud config set project <YOUR_PROJECT_ID>


================================================================================
11. ENVIRONMENT VARIABLES
================================================================================

Create a .env file in the project root:

  # Supabase
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-supabase-anon-or-service-key

  # Google Cloud
  GOOGLE_CLOUD_PROJECT=your-gcp-project-id

  # PostgreSQL (direct connection -- used by /test-db only)
  DATABASE_URL=postgresql://user:password@host:port/dbname

The server also requires Google Cloud Application Default Credentials to be
set up (via gcloud auth application-default login or a service account key).


================================================================================
12. RUNNING LOCALLY
================================================================================

  # Start the development server with auto-reload
  uvicorn main:app --reload --port 8000

Once running:

  http://localhost:8000/                           Health check
  http://localhost:8000/docs                       Swagger UI (interactive docs)
  http://localhost:8000/redoc                      ReDoc (alternative docs)
  ws://localhost:8000/ws/voice/{user_id}?is_audio=true   Voice agent WebSocket


================================================================================
13. DEPLOYMENT
================================================================================

The application is deployed to Google Cloud Run using source-based deployment:

  gcloud run deploy mental-health-api --source .

This command:
  1. Builds a Docker image using the Dockerfile
  2. Pushes it to Google Container Registry
  3. Deploys it to Cloud Run with the PORT environment variable set to 8080

Dockerfile Summary:

  FROM python:3.10-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  ENV PORT=8080
  CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT

Environment variables (SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLOUD_PROJECT,
DATABASE_URL) must be configured in the Cloud Run service settings or via
Secret Manager.


================================================================================
14. TESTING
================================================================================

--- WebSocket Test Clients ---

Two test scripts are provided for testing the WebSocket-based voice and chat
endpoints:

  # Basic WebSocket test
  python test_client.py

  # Full flow test
  python test_full_client.py

--- Manual API Testing ---

Use the built-in Swagger UI at /docs to test all REST endpoints interactively.

--- Voice Agent Smoke Test ---

  # Health check -- verify ADK agent instantiation
  curl http://localhost:8000/voice/health

  # Text-only test -- builds personalised prompt and returns greeting
  curl -X POST http://localhost:8000/voice/test/2

================================================================================