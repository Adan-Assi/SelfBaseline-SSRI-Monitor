# 📱 Mobile Frontend Architecture (React Native)

## 🏗️ System Design
The frontend is built with **Expo** and **Zustand** for state management. It is designed to handle complex asynchronous streams (WebSockets) and background data collection (Sensors).

### High-Level Data Flow


| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| **UI Layer** | React Native / Paper | Component rendering and user interaction. |
| **State Management** | Zustand | Global stores for Auth, Sensors, and Voice sessions. |
| **Communication** | Axios / WebSockets | REST API polling and real-time PCM audio streaming. |
| **Persistence** | AsyncStorage | Local caching for sensor data during offline periods. |

---

## 🚦 Runtime Modes (The Strategy)
To allow development without a constant backend connection, the app implements a **Triple-Mode** architecture:

1. **Mock Mode**: Uses local JSON data. Ideal for UI/UX testing and presentations.
2. **Partial Mode**: Connects to the DB for data but mocks the complex Voice WebSocket.
3. **Real Mode**: Full end-to-end integration with FastAPI and Gemini Live.

---

## 📡 Sensor & Background Pipeline
The app passively monitors behavioral signals to build a "Self-Baseline" for the patient.

* **Collection**: Uses `expo-location` and `expo-sensors`.
* **Buffering**: Data is batched locally to save battery.
* **Sync**: A background task triggers every 12 hours (or on app launch) to send data to `POST /sensors/batch`.

---

## 🎙️ Voice Interaction Logic
The Voice module is the most complex frontend component:
- **Audio Engine**: Uses `expo-av` for recording and playback.
- **Encoding**: Converts mic input to Base64/PCM chunks.
- **WebSocket**: Maintains a heartbeat and handles "Interruption" events from the server.

---

## 📁 Project Folder Structure
```text
src/
├── api/            # Axios configurations and REST endpoints
├── background/     # Background task orchestration & sync logic
├── config/         # App constants and environment settings
├── features/       # Main app modules (Check-ins, Dashboard)
├── hooks/          # Custom React hooks for logic reuse
├── sensors/        # Native sensor collection implementations
├── types/          # TypeScript/Flow definitions
├── ui/             # Reusable UI components and themes
└── utils/          # Helper functions and data formatters
```