# 📱 Mental Health Mobile Client (React Native / Expo)

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-443333?style=flat)](https://github.com/pmndrs/zustand)

The mobile frontend for the Mental Health ecosystem, enabling patients to perform daily check-ins, engage in AI voice therapy, and track behavioral health via passive sensors.

---

## 🚀 Getting Started

1. **Clone & Install**
   ```fe-setup
   cd BaseLine_FE
   npm install
   ```

2. **Environment Configuration**

   Create a `.env` file **inside the `BaseLine_FE` directory**. The `APP_MODE` you choose here determines if you need to set up the Backend.

   ```fe-env
   # Find your local IP via 'ipconfig' (Windows) or 'ifconfig' (Mac)
   EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
   
   # Modes: 
   # 'mock'    -> No Backend needed (uses local JSON).
   # 'partial' -> Backend suggested (local login, but attempts real Voice/Sensors).
   # 'real'    -> Backend REQUIRED (real login, DB, and Voice).
   EXPO_PUBLIC_APP_MODE=mock 
   ```

3. **Dependency Check**
   * **Using `mock`?** Skip the Backend setup and go to Step 4.
   * **Using `partial` or `real`?** You **MUST** now follow the [Backend Quick Start](../BaseLine_BE_main/README.md) instructions to launch the FastAPI server.

4. **Launch**
   ```fe-run
   npx expo start --clear
   ```

    *Scan the QR code with your phone's camera (iOS) or Expo Go app (Android).*

-----

## 🚦 Runtime Configuration

The app supports three distinct modes defined in your `.env`. This allows for development even without a stable backend connection.

| Mode | Behavior | Best For |
| :--- | :--- | :--- |
| **`mock`** | Uses 100% local JSON data. | UI/UX Work, Fast Demos. |
| **`partial`** | Real REST API calls; Mocked WebSockets. | Feature testing. |
| **`real`** | Full Backend + Gemini Live Integration. | End-to-end testing. |

-----

## 📂 Key Modules & Logic
- **API Layer (`src/api`)**: Centralized management of backend communication.

- **Sensor Pipeline (`src/sensors` & `src/background`)**: Handles the high-frequency collection and scheduled uploading of behavioral data.

- **Feature Modules (`src/features`)**: Contains the core logic for daily check-ins and AI insights.

- **UI System (`src/ui`)**: Reusable components built for a consistent mental-health monitoring experience.

*Detailed Architecture: See [ARCHITECTURE.md](./docs/ARCHITECTURE.md)*

-----

## 🎙️ Voice Agent Prerequisites

To use the **Real Mode** voice interaction:

1.  Ensure the Backend server is running.
2.  Grant **Microphone Permissions** when prompted on your mobile device.
3.  Audio is streamed as **PCM 16-bit 16kHz** chunks.

-----

## 📡 Sensor Collection Note

Passive monitoring (GPS, Wi-Fi, App Usage) is optimized for battery life.

  - In **Mock Mode**, sensor collection is disabled.
  - In **Real Mode**, data is batched locally and uploaded every 12 hours or upon app launch.

-----

*Developed as part of the SelfBaseline Project.*