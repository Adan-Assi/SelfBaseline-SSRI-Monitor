# Suicide Risk Prediction Pipeline (Algo)

## 🧠 Overview
This module implements a passive suicide risk prediction pipeline that utilizes smartphone sensor data to predict psychological constructs (**restlessness, impulsivity, irritability, insomnia**) and detects behavioral deviations from an individual's personal baseline.

The system mirrors three real-world clinical stages of SSRI treatment monitoring:
1. **Stage 1 (Training):** Learns general sensor-to-construct relationships from historical data.
2. **Stage 2 (Baseline):** Establishes a "Normal" behavioral profile for a specific patient during their first 14 days of treatment.
3. **Stage 3 (Monitoring):** Detects statistically significant deviations (Z-Scores) that trigger clinical "elevation" flags.

---

## 🛡️ The Alerting Framework
To prevent alert fatigue and ensure clinical safety, the system uses a tiered approach to score deviations:

| Tier | Z-Score | Status | Operational Action |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **$Z \ge 2.5$** | `🔴 CRISIS` | **Trigger Voice Agent Check-in Call** |
| **Tier 2** | **$1.5 \le Z < 2.5$** | `🟡 ELEVATED` | Log for clinical review |
| **Tier 3** | **$Z < 1.5$** | `✅ STABLE` | Passive background monitoring |

*For the mathematical derivation of these thresholds and the logic behind our detection fixes, see the [Technical Deep-Dive](./docs/TECHNICAL_DETAILS.md).*

---

## 📂 Project Structure
```text
|-- weight_features/                  # Feature engineering from raw sensors
|-- dataset/                          # Anonymized user data and sensor logs
|-- models/                           # Trained Random Forest (.pkl) models
|-- train_models.py                   # Model training script
|-- predict_risk.py                   # Daily risk scoring engine
|-- alert_system.py                   # Real-time monitoring & alert logic
|-- TECHNICAL_DETAILS.md              # Audit reports and mathematical fixes
```

---

## 🚀 Execution Guide

1. **Extract Features:** Convert raw logs into 20 engineered features.
      ```bash
      python weight_features/sensor_features.py
      ```

2. **Train Models:** Generate the construct prediction models.
      ```bash
      python train_models.py
      ```

3. **Deploy Monitor:** Run the alert engine simulation.
      ```bash
      python alert_system.py
      ```

---

## 📈 Configuration

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **ROLLING_WINDOW** | 14 Days | Period used to calculate personal baseline. |
| **Z_THRESHOLD** | 1.5 | Minimum deviation to trigger an elevated flag. |
| **Anomaly Blend** | 50/50 | Weighted split between ML predictions and sensor anomalies. |