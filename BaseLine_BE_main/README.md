# 🧠 Mental Health Backend (FastAPI)

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat&logo=googlegemini)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

A high-performance FastAPI backend supporting a mental-health ecosystem. Features include AI-driven insights, real-time voice therapy sessions, and passive sensor data collection.

---

## 🚀 Quick Start

> **Note:** This server is required only if the Frontend is set to `partial` or `real` mode.

1. **Clone & Setup**
   ```be-setup
   cd BaseLine_BE_main
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   Create a `.env` file **inside the `BaseLine_BE_main` directory**. These keys are required for AI and Database features to initialize.

   ```be-env
   # Database: From Supabase Project Settings > API
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_service_role_key

   # AI: From Google Cloud Console
   GOOGLE_CLOUD_PROJECT=your_gcp_project_id
   ```

3. **Run Server**
   ```be-run
   # --host 0.0.0.0 is required for the mobile app to connect over Wi-Fi
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *Verify connectivity at: `http://localhost:8000/docs`*

---

## 🛠️ Core Capabilities

| Feature | Technology | Description |
| :--- | :--- | :--- |
| **Voice Agent** | Google ADK + Gemini Live | Bidirectional PCM audio therapy sessions via WebSockets. |
| **Insights** | Gemini 2.0 Flash Lite | Analyzes 7-day check-in trends to generate patient feedback. |
| **Sensors** | REST API | Passive collection of GPS, Wi-Fi, battery, and app usage. |
| **Patient Management** | Supabase (PostgreSQL) | Secure storage for check-ins and doctor-patient linking. |

-----

## 📂 Documentation Map

To keep this repository clean, detailed documentation is split into separate modules:

  * **[API Reference](./docs/API_REFERENCE.md)**: Full list of REST endpoints and WebSocket protocols.
  * **[Database Schema](./docs/DATABASE.md)**: Table structures for Users, Check-ins, and Sensors.
  * **[Voice Agent Deep-Dive](./docs/VOICE_AGENT.md)**: Detailed lifecycle of the ADK integration.

-----

## ☁️ Deployment (Google Cloud Run)

Deploy the service in seconds using source-based builds:

```bash
gcloud run deploy mental-health-api --source .
```

-----

*Developed for the SelfBaseline Project.*

<details>
<summary><b>View Voice Agent Session Lifecycle</b></summary>

1. Client connects to `/ws/voice/{user_id}`.

2. Server fetches 7-day data and builds a personalized Agent.

3. Bidirectional audio (PCM) flows through the ADK Runner.

4. Turns are logged automatically to the DB.

</details>