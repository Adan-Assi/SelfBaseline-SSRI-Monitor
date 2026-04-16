# 🗄️ Database Schema (Supabase/PostgreSQL)

This project uses Supabase as the primary data store. The schema is designed to handle relational user data alongside high-frequency time-series sensor logs.

## 👤 User & Relationship Management

### `users`
Core profiles for both patients and clinicians.
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `full_name`: String
- `role`: Enum ('patient', 'doctor')

### `patient_doctor_link`
Junction table for clinician-patient assignments.
- `doctor_id`: UUID (FK -> users.id)
- `patient_id`: UUID (FK -> users.id)

---

## 📝 Check-ins & AI Insights

### `questions`
The bank of validated mental health questions.
- `id`: Integer (PK)
- `text`: String (e.g., "How restless have you felt today?")
- `category`: String

### `check_ins`
User responses to daily surveys.
- `id`: UUID (PK)
- `user_id`: UUID (FK -> users.id)
- `question_id`: Integer (FK -> questions.id)
- `response_value`: Integer (Scale 1-5)
- `created_at`: Timestamp

### `insights_summary`
Gemini-generated 7-day behavioral analysis.
- `user_id`: UUID (FK -> users.id)
- `summary_text`: Text
- `risk_level`: String (Low, Medium, High)
- `last_updated`: Timestamp

---

## 🎙️ Voice Session Logs

### `voice_conversations`
- `id`: UUID (PK)
- `user_id`: UUID (FK)
- `session_start`: Timestamp

### `voice_conversation_turns`
- `id`: UUID (PK)
- `conversation_id`: UUID (FK)
- `role`: String ('user', 'model')
- `content`: Text (Transcript)
- `audio_path`: String (Path to Supabase Storage bucket)

---

## 📡 Passive Monitoring (Sensors)

Passive data is captured at high frequency to monitor mobility and app-usage habits.

| Table Name | Key Columns |
| :--- | :--- |
| **`gps_locations`** | `user_id`, `latitude`, `longitude`, `accuracy` |
| **`wifi_scans`** | `user_id`, `ssid`, `rssi` (signal strength) |
| **`battery_status`** | `user_id`, `level`, `is_charging` |
| **`app_usage_stats`** | `user_id`, `package_name`, `duration_ms` |

---
*For a full ER Diagram, refer to the Supabase Dashboard.*

## 🛠️ How to View in Supabase
To view the live data and the generated ER Diagram:
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Table Editor** to see raw rows.
3. Navigate to **Database > Schema Visualizer** to see the auto-generated ER Diagram of the relationships defined above.