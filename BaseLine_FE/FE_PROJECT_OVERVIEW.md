````md
# Mental Health Mobile Application

### Project Overview

---

## Overview

This project implements the **mobile client** of a mental-health monitoring and support system.

The application enables patients to:

- complete structured daily check-ins
- receive AI-generated insights
- engage in real-time voice interactions with a conversational agent
- collect passive behavioral data from their device

The frontend is built using **React Native (Expo)** and is designed to simulate a **production-grade mobile system**, integrating real-time communication, background processing, and flexible backend connectivity.

---

## System Architecture

```text
      ┌──────────────────────────┐
      │  React Native Mobile App │
      └──────────┬───────────────┘
                 │
       ┌─────────┼────────────┐
       │         │            │
       ▼         ▼            ▼
   REST API   WebSocket   Local State (Zustand)
       │         │            │
       └─────────┴────────────┘
                 │
                 ▼
        FastAPI Backend
                 │
        ┌────────┴────────┐
        ▼                 ▼
   Supabase DB       Google Gemini
```
````

---

## Core Features

### Daily Check-ins

The application provides a structured questionnaire flow allowing patients to report their mental state.

Supported input types:

- Slider (numeric values)
- Multiple-choice

Responses are collected locally and submitted to the backend via:

```text
POST /checkin/submit
```

---

### Dashboard & Insights

The home screen presents:

- patient greeting and profile data
- weekly streak tracking (from `/patient/dashboard`)
- AI-generated insights (from `/insights/{user_id}`)
- entry points to core actions (questionnaire, voice session)

The frontend aggregates multiple endpoints to construct the dashboard state.

---

### Voice Interaction

The application supports a real-time conversational flow with an AI agent.

- communication is handled via a **persistent WebSocket connection**
- audio and transcript events are streamed bidirectionally
- backend generates responses using Gemini-based models

WebSocket endpoint:

```text
WS /ws/voice/{user_id}?is_audio=true
```

The frontend is responsible for:

- microphone capture (Expo Audio)
- audio chunk encoding
- streaming over WebSocket
- playback of agent responses
- real-time transcript synchronization
- handling interruptions and turn-taking

Additionally, the backend provides:

```text
POST /voice/test/{user_id}
```

for text-based debugging of the agent (not used in production flow).

---

### Sensor Collection

The application passively collects behavioral signals from the device.

Supported categories:

- GPS
- Wi-Fi scans
- Wi-Fi-based location inference
- battery and charging state
- charging periods
- app session activity

Data is:

- collected on-device
- normalized into API-compatible format
- batched locally
- uploaded using the sensor batch endpoint:

  ```text
  POST /sensors/batch
  ```

---

### Background Processing

Sensor data is uploaded using a background-safe mechanism:

- scheduled upload windows (twice daily)
- retry-safe queue system
- local persistence fallback (AsyncStorage)

This ensures reliability while minimizing battery and network overhead.

---

## Runtime Modes

A key architectural decision in this project is the use of **runtime modes**, enabling development and testing independent of backend readiness.

### Mock Mode

- fully local execution
- no backend dependency
- no sensors
- used for UI development and demonstrations

---

### Partial Mode

- hybrid behavior
- combines real backend calls with fallback/mock logic

---

### Real Mode

- full backend integration
- uses live REST APIs and WebSocket communication
- used for end-to-end validation

---

## Development Approach

The project is built using a gradual integration approach:

1. build UI and flows independently (**mock mode**)
2. integrate backend incrementally (**partial mode**)
3. validate full system behavior (**real mode**)

This allows continuous development even when:

- backend features are incomplete
- native capabilities are limited
- environment constraints exist

---

## Technical Highlights

- feature-based frontend architecture
- clear separation of UI, business logic, and data layers
- WebSocket-based real-time communication
- sensor data pipeline aligned with backend schema
- background task orchestration (safe upload queue + scheduler)
- flexible runtime configuration system

---

## Limitations

- some native capabilities are limited in Expo Go
- background/sensor behavior differs between Expo Go and dev builds
- no automated testing framework implemented

---

## Conclusion

This project demonstrates the design and implementation of a modern mobile system combining:

- mobile development (React Native / Expo)
- real-time communication (WebSocket)
- backend integration (REST APIs)
- AI-assisted interaction (Gemini-based)
- behavioral data collection

---

## Author

Developed as part of an academic project.

Focus areas include:

- Mobile development
- System design
- Real-time systems
- Human-centered applications

```

```
