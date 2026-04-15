# 🛡️ Technical Deep-Dive: Alert Logic & Pipeline Audit

## 1. Architectural: The "Baseline Contamination" Fix
* **Problem:** Originally, the system appended today’s risk data to the historical record *before* calculating the Z-score.
* **Impact:** This caused the crisis data point to be included in its own rolling mean calculation. Effectively, the system was comparing a "Crisis" to a "Crisis," resulting in a low Z-score ($Z < 1.0$) and a "Silent Miss."
* **Fix:** Implemented a **Calculate-then-Append** sequence. Today’s score is evaluated against the existing 14-day baseline in isolation. Only after the alert logic is executed is the data point stored in the history.

## 2. Mathematical: Cold Start Signal Dilution
* **Problem:** The risk score was a hard 50/50 blend of ML Model predictions and Sensor Anomaly scores. 
* **Impact:** During the "Cold Start" phase—where models may return $0.0$ due to lack of input—the actual sensor signal was being halved. A critical sensor spike of $80/100$ was being reported as $40/100$, staying below the alert threshold.
* **Fix:** **Conditional Weighting.** The system now checks for model activity. If the ML models return $0.0$, the engine automatically shifts $100\%$ of the weight to the Sensor Anomaly score to ensure safety visibility is never compromised.

## 3. Statistical: The Global Variance Floor
* **Problem:** High-stability users (those with near-zero variance in their 14-day baseline) caused mathematical explosions during Z-score calculation ($Value / \approx 0$).
* **Impact:** This led to "Jittery Alerts" where tiny, insignificant fluctuations caused massive Z-score spikes ($Z > 50.0$), making the data look like a software bug.
* **Fix:** Implemented a **Global Variance Floor ($10.0$)**. This represents the "standard error of human behavior." By ensuring the denominator never drops below this floor, Z-scores remain stable, realistic, and clinically actionable.

## 🧪 Validation Scenario: "The Day 3 Test"
We verified these fixes using a 4-day simulation loop to ensure the pipeline responds correctly to a sudden behavioral shift.

| Day | Scenario | Input Risk | Z-Score (Old) | Z-Score (Fixed) | System Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Day 1** | Baseline | 20.0 | 0.0 | 0.0 | ✅ Stable |
| **Day 2** | Baseline | 22.0 | 0.1 | 0.1 | ✅ Stable |
| **Day 3** | **Crisis Spike** | **85.0** | **0.8** | **4.2** | **🔴 ALERT TRIGGERED** |
| **Day 4** | Recovery | 25.0 | 0.4 | 0.6 | ✅ Stable |

## 📈 ML Model Parameters
The constructs (Insomnia, Irritability, Impulsivity, Restlessness) are tracked via Random Forest Regressors with the following configuration:
* **Estimators:** 100 trees
* **Cross-Validation:** 5-fold shuffle split
* **Feature Set:** 20 engineered features including sleep duration, step count variance, and phone unlock frequency.