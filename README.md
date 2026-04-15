# SelfBaseline: Early Signal Detection for SSRI Monitoring

## 🌟 Project Vision
**SelfBaseline** is a digital health system designed to detect early behavioral and physiological deviations from an individual’s own baseline following the initiation of SSRIs (Selective Serotonin Reuptake Inhibitors). 

Unlike traditional systems that compare patients to population norms, our framework models **change-from-self**. We use passive digital signals—specifically sleep, activity, and phone use patterns—to surface subtle "deviation flags" during the critical first 4 weeks of medication, supporting clinical assessment and shared decision-making.

---

## 🏗️ System Architecture
The project is divided into three specialized modules that work in sync:

### 1. [Baseline_Algo](./Baseline_Algo) (The Brain)
A machine learning pipeline that processes raw sensor data to predict psychological constructs and detect anomalies.
* **Clinical Stages:** Handles Training (Historical data), Baseline (first 14 days), and Monitoring (ongoing).
* **Models:** Uses Random Forest models to track Insomnia, Irritability, Impulsivity, and Restlessness.
* **Tech:** Python, Scikit-Learn, Pandas.

### 2. [BaseLine_BE_main](./BaseLine_BE_main) (The Core)
A robust FastAPI backend that orchestrates data flow, user management, and AI interactions.
* **Voice Agent:** Integrated with Google Gemini for real-time conversational support.
* **Insights:** Generates personalized patient insights based on sensor and survey data.
* **Storage:** Integrated with Supabase/PostgreSQL.
* **Tech:** FastAPI, SQLAlchemy, WebSockets, Google Cloud.

### 3. [BaseLine_FE](./BaseLine_FE) (The Interface)
A React Native mobile application designed for patient-facing interactions.
* **Daily Check-ins:** Intuitive UI for questionnaires and voice sessions.
* **Passive Sensing:** Collects GPS, Wifi, and phone usage data in the background.
* **Tech:** React Native, Expo, TypeScript.

---

## 🚀 Key Features
- **Individualized Baselines:** Each patient is their own reference point; no absolute "mood levels" required.
- **Sleep as a Lead Signal:** Uses sleep fragmentation as a validated marker for early warning.
- **AI Voice Sessions:** Real-time conversational therapy checks triggered by significant baseline deviations.
- **Interpretable Flags:** Focuses on transparent "deviation signals" for clinicians rather than opaque "black-box" diagnoses.

---

## 🛠️ Setup & Installation
To run the full system, you will need to configure each module individually. Please refer to the specific documentation in each folder:

1. **Algorithm:** See [Algo README](./Baseline_Algo/README.md) for model training and risk prediction.
2. **Backend:** See [Backend README](./BaseLine_BE_main/README.md) for API setup and environment variables.
3. **Frontend:** See [Frontend README](./BaseLine_FE/README.md) for mobile app installation and Expo configuration.

---

## 📋 One-Line Takeaway
> **A baseline-focused MVP using sleep as the first test case for individualized early-warning signals, designed to support mental health treatment with data-driven clinical insights.**

---

## 👥 Contributors
*Developed as a collaborative project to innovate early SSRI monitoring.*