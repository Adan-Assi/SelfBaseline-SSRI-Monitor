# Mental Health Frontend

A React Native (Expo) mobile application for a mental-health monitoring and support system that enables daily check-ins, AI-powered insights, real-time voice therapy sessions, and passive sensor collection from patient devices.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Runtime Modes](#runtime-modes)
- [Backend Configuration](#backend-configuration)
- [Frontend ↔ Backend Integration](#frontend--backend-integration)
- [Voice Flow](#voice-flow)
- [Sensor Data Flow](#sensor-data-flow)
- [Setup & Installation](#setup--installation)
- [Running Locally](#running-locally)
- [Application Flow](#application-flow)
- [Platform Support](#platform-support)
- [Known Limitations](#known-limitations)

---

## Overview

This repository contains the mobile client for the Mental Health system. The application is designed for patients, providing structured daily check-ins, behavioral insights, and real-time conversational support.

> Note: The first Android run may take several minutes due to native build setup.

### Key Capabilities

| Capability            | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| Daily Check-ins       | Structured questionnaires with multiple answer types               |
| AI Insights           | Displays backend-generated insights on the dashboard               |
| Real-time Voice Agent | Voice check-in flow with backend integration                       |
| Sensor Collection     | Passive device data collection (GPS, Wi-Fi, battery, app sessions) |
| Background Uploads    | Batched and scheduled sensor uploads                               |
| Runtime Modes         | Supports `mock`, `partial`, and `real` execution modes             |

---

## Architecture

┌────────────────────────────┐
│   React Native (Expo App)  │
└──────────────┬─────────────┘
               │
     ┌─────────┼─────────┐
     │         │         │
     ▼         ▼         ▼
 UI Layer   Feature   State (Zustand)
 Components Modules
            │
            ▼
   REST / WebSocket Layer
            │
            ▼
     FastAPI Backend
     (Supabase + Gemini)


---

## Tech Stack

| Technology          | Role                             |
| ------------------- | -------------------------------- |
| React Native + Expo | Mobile application framework     |
| TypeScript          | Static typing                    |
| Expo Router         | Navigation                       |
| Zustand             | State management                 |
| WebSocket / HTTP    | Real-time and REST communication |
| Expo APIs           | Sensors, background tasks, audio |
| AsyncStorage        | Local persistence                |

---

## Project Structure

app/
  _layout.tsx
  index.tsx

  (auth)/
    _layout.tsx
    welcome.tsx
    signup-intro.tsx
    name.tsx
    email.tsx
    password.tsx
    birthday.tsx
    goal.tsx
    all-set.tsx
    login.tsx

  (checkin)/
    _layout.tsx
    checkin-question.tsx
    checkin-time.tsx
    voice-checkin.tsx

  (main)/
    _layout.tsx
    home.tsx

assets/

src/
  api/
  config/
  background/
  features/
  hooks/
  sensors/
  ui/
  utils/
  types/

---

## Runtime Modes

| Mode      | Description                        |
| --------- | ---------------------------------- |
| `mock`    | Fully local execution (No Sensors) |
| `partial` | Hybrid mode (fallback + backend)   |
| `real`    | Full backend integration           |

Configured in:

src/config/runtimePolicy.ts

---

## Backend Configuration

The frontend dynamically selects between:

- mock data
- partial backend usage
- full backend integration

based on runtime policy.

---

## Frontend ↔ Backend Integration

### REST Endpoints

| Feature              | Endpoint                           |
| -------------------- | ---------------------------------- |
| Create user          | `POST /users`                      |
| Login                | `POST /auth/login`                 |
| Save patient details | `POST /patient/details`            |
| Dashboard            | `GET /patient/dashboard/{user_id}` |
| Questions            | `GET /questions`                   |
| Submit Answers       | `POST /checkin/submit`             |
| Insights             | `GET /insights/{user_id}`          |
| Sensors              | `POST /sensors/batch`              |

---

### Voice Agent (WebSocket)

WS /ws/voice/{user_id}?is_audio=true


#### Enables:

- bidirectional audio streaming
- real-time transcript updates
- AI-generated responses
- turn completion + interruption handling

---

### Important FE Rule
Questionnaire sliders are sent as integers only.

---

## Voice Flow

User speaks
   ↓
Microphone capture (Expo Audio)
   ↓
Chunked audio stream
   ↓
WebSocket send
   ↓
Backend processing
   ↓
Audio response
   ↓
Playback
   ↓
Transcript updates


---

## Sensor Data Flow

Sensors
   ↓
Local collection
   ↓
Batch creation
   ↓
AsyncStorage queue
   ↓
Background worker
   ↓
Upload to backend


---

## Setup & Installation## Setup & Installation

This section describes how to prepare the development environment and install the project dependencies. These steps must be completed before running the application.

---

### Setup

#### 1. System Requirements

Ensure the following software is installed on your machine:

- Node.js (recommended version 18 or higher)
- npm

In addition, at least one of the following environments is required:
- Expo Go - for running the app on a physical device
- Android Studio - for running the app on an emulator or development build

---

#### 2. Installing Expo Go

Expo Go allows running the application directly on a mobile device without building native code.
- iOS: install from the App Store
- Android: install from Google Play

---

#### 3. Android Environment Setup (Emulator)

If you intend to run the application using an Android emulator, ensure that:

- Android Studio is installed
- The Android SDK is configured
- Android Emulator Configuration:
  Use a virtual device with:
      * Device: Pixel (or similar)
      * Android Version: API 33–34
      * Architecture: x86_64
   Example:
      * Android 14 (API 34), x86_64

The emulator must be running before attempting to launch the application.

---

#### 4. Installing Dependencies

Install all required dependencies:

npm install

---

#### 5. Runtime Configuration
The application supports multiple runtime modes.  
To switch modes, update the following file:

src/config/runtimePolicy.ts


---

### Running Locally

#### Option 1 — Expo Go

npx expo start


---

#### Option 2 — Android Dev Build

> Note: The first Android build may take several minutes, and can take up to 20 minutes depending on the environment and system performance.
npx expo run:android


---

## Application Flow

### First-Time User

1. Welcome
2. Signup intro
3. Name
4. Email
5. Password
6. Birthday
7. Goal
8. Check-in time
9. All set
10. Home

---

### Returning User

1. Login
2. Home

---

### Main Flow

1. Home
2. Questionnaire
3. Voice Session
4. Home

---

## Platform Support

| Platform          | Notes              |
| ----------------- | ------------------ |
| Expo Go           | UI testing         |
| Android Dev Build | Full functionality |
| iOS Expo Go       | Demo flows         |

---

## Known Limitations

- Some native capabilities are limited in Expo Go
- Background/sensor behavior may differ across environments
- Full functionality depends on backend in `partial` / `real`

---

## Documentation

See:


PROJECT_OVERVIEW.md

