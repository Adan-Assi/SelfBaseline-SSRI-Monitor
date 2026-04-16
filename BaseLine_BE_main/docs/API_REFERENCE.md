# 🛣️ API Reference

The backend exposes a REST API and a WebSocket gateway. 
**Interactive Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

---

## 🔐 Authentication
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/auth/register` | `POST` | Register a new user (Doctor or Patient). |
| `/auth/login` | `POST` | Exchange credentials for a JWT Access Token. |

---

## 👥 Patient Management
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/patients` | `GET` | Returns a list of all patients assigned to the logged-in doctor. |
| `/patients/{id}` | `GET` | Fetches a patient's full dashboard (Check-ins + Sensor trends). |
| `/patients/link` | `POST` | Body: `{ "patient_id": "UUID", "doctor_id": "UUID" }` |

---

## 📋 Check-ins & AI Insights
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/questions` | `GET` | List all active mental health survey questions. |
| `/check_in/submit` | `POST` | Submit daily survey answers. |
| `/insights/{user_id}` | `GET` | Triggers/Retrieves the Gemini 7-day behavioral summary. |

---

## 📡 Sensor Data (Passive Monitoring)
Endpoints used by the mobile background service to sync device data.
- **`POST /sensors/upload`**
  - **Payload:** Batch array of GPS, Wi-Fi, and App Usage logs.
- **`GET /sensors/{user_id}/summary`**
  - **Returns:** Aggregated trends (e.g., "Screen time increased by 20%").

---

## 🎙️ Voice Agent (WebSocket)
**Endpoint:** `WS /ws/voice/{user_id}`

The Voice Agent utilizes a stateful bidirectional stream:
1. **Connect:** Establish WebSocket with Bearer Token.
2. **Handshake:** Server sends `READY` once the Gemini Live session is initialized with 7-day patient context.
3. **Stream:** Send/Receive raw **PCM 16-bit Mono 16kHz** audio chunks.
4. **Close:** Connection terminates; server persists the transcript to the database.

---

## 🛠️ Utility & Health
- `GET /health`: Returns `{ "status": "ok", "version": "1.0.0" }`.
- `GET /voice/health`: Verifies Google Cloud ADK connectivity and Gemini API quota.