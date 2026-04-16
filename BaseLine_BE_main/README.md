# 🧠 Mental Health Backend (FastAPI)

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat&logo=googlegemini)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

A high-performance FastAPI backend supporting a mental-health ecosystem. Features include AI-driven insights, real-time voice therapy sessions, and passive sensor data collection.

---

## 🚀 Quick Start

### Prerequisites
* Python 3.10+
* [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (authenticated)
* Supabase Account & Project

### Installation
1. **Clone & Setup**
    ```bash
    git clone [https://github.com/Dorivanirtau/MentalHealthBE.git](https://github.com/Dorivanirtau/MentalHealthBE.git)
    cd MentalHealthBE
    python -m venv venv
    source venv/bin/activate  # Windows: .\venv\Scripts\activate
    pip install -r requirements.txt
    ```

2.  **Environment Configuration**
    Create a `.env` file in the root:

    ```env
    SUPABASE_URL=your_url
    SUPABASE_KEY=your_key
    GOOGLE_CLOUD_PROJECT=your_project_id
    ```

3.  **Run Server**

    ```bash
    uvicorn main:app --reload --port 8000
    ```

    *Access API Docs at: [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)*

-----

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