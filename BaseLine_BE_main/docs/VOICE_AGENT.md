# 🎙️ Voice Agent Implementation (Gemini Live + ADK)

## 💡 Overview
The Voice Agent provides a real-time, bidirectional audio therapy session. It uses the Google Gemini ADK (Agent Development Kit) to handle the multi-modal "Live" connection, allowing users to speak naturally to the AI.

---

## 🔄 Session Lifecycle

1. **Handshake**: The mobile client initiates a connection to `WS /ws/voice/{user_id}`.
2. **Context Injection**:
   - The server queries the `insights_summary` table for the user's last 7 days of behavioral data.
   - It builds a **System Prompt** that informs the AI of the user's current risks (e.g., "The user has shown high irritability and low sleep for 3 days").
3. **Audio Stream**: 
   - **Input**: Client sends raw PCM audio chunks via WebSocket.
   - **Processing**: The ADK Runner forwards these to Gemini 2.0 Flash.
   - **Output**: Server streams PCM audio responses back to the client for immediate playback.
4. **Persistence**: At the end of the turn, the conversation transcript is saved to the `voice_conversation_turns` table.

---

## 🛠️ Technical Stack
- **Google Gemini 2.0 Flash Lite**: The "brain" handling the conversation.
- **WebSocket (FastAPI)**: Persistent connection for low-latency audio.
- **PyAudio / PCM**: Standard 16-bit Mono 16kHz audio format.
- **ADK Runner**: Internal wrapper to manage the Gemini Live session state.

---

## 🧪 Testing the Voice Agent

### 1. Smoke Test (REST)
Verify the agent can instantiate and build a prompt without a microphone:
bash-start
curl -X POST http://localhost:8000/voice/test/{user_id}
bash-end

### 2. Full WebSocket Simulation
Run the provided test client to simulate a real conversation:
bash-start
python tests/test_full_client.py
bash-end

---

## 📋 Configuration Variables
These must be set in your `.env` for the Voice Agent to function:
| Variable | Description |
| :--- | :--- |
| `GOOGLE_CLOUD_PROJECT` | Used for Vertex AI / Gemini billing. |
| `LOCATION` | e.g., `us-central1`. |
| `VOICE_MODEL` | defaults to `gemini-2.0-flash-exp`. |

---

## ⚠️ Known Limitations & Safety
- **Latency**: High-speed internet is required for "Live" feeling; slow connections may cause audio stuttering.
- **Safety Filters**: Gemini's default safety settings are enabled to prevent harmful medical advice; the agent is instructed to refer users to emergency services if a crisis is detected.