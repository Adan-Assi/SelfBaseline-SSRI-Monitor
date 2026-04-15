# 🛡️ Technical Audit: Alert System Logic & Detection Errors
**Project:** `ECommerce / BaselineAlgo`  
**Component:** `alert_systems.py` / `StudentMonitor`

---

## Executive Summary
During pipeline simulation, we identified that the **Alert Engine** (Voice Agent Trigger) was failing to detect high-risk events. Even with valid sensor spikes, the system returned a `STABLE` status. We have implemented 4 structural fixes to prevent these "Silent Misses."

---

## 1. Architectural: The "Baseline Contamination"
* **The Problem:** The system added today’s risk data to the history **before** calculating the Z-score.
* **The Impact:** Today’s crisis became part of its own average. The system was essentially comparing a "Crisis" to a "Crisis," making it look normal ($Z < 1.0$).
* **The Fix:** Shifted to a **Calculate-then-Append** sequence. We now isolate today’s data from the baseline calculation.



## 2. Mathematical: "Cold Start" Signal Dilution
* **The Problem:** Risk was a hard 50/50 blend of ML Models and Sensors.
* **The Impact:** During "Cold Start" (where ML models return `0.0`), the system halved the sensor signal. A high sensor risk of **80** was diluted to **40**, looking like "Stable" behavior.
* **The Fix:** **Conditional Weighting.** If ML models are inactive ($0.0$), the sensor anomaly carries 100% weight to maintain safety visibility.

## 3. Statistical: Variance Stabilization (The "50.0 Z-score" Fix)
* **The Problem:** If a student was "perfectly stable" for 2 days (zero variance), a jump on Day 3 caused a mathematical explosion (division by near-zero).
* **The Impact:** Z-scores would oscillate between $0.0$ and $50.0$, making the data look like a software bug.
* **The Fix:** Implemented a **Global Variance Floor (10.0)**. This represents "Normal Human Fluctuation" and keeps Z-scores within a realistic, actionable range ($Z \approx 5.0$).



## 4. Operational: Tiered Alerting Logic
To prevent "Alert Fatigue," we’ve moved from a binary threshold to a prioritized Tier System:

| Tier | Z-Score | Status | Operational Action |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **$Z \ge 2.5$** | `🔴 CRISIS` | **Immediate:** Trigger Voice Agent Call |
| **Tier 2** | **$1.5 \le Z < 2.5$** | `🟡 ELEVATED` | **Logged:** Flag for daily clinical review |
| **Tier 3** | **$Z < 1.5$** | `✅ STABLE` | **Passive:** Background monitoring only |

---

## 🧪 Validation Scenario: "The Day 3 Test"
We verified these fixes using a 4-day simulation (Baseline → Baseline → Crisis Spike → Recovery).

| Metric | Day 1 & 2 (Normal) | Day 3 (Crisis) | Day 4 (Recovery) |
| :--- | :--- | :--- | :--- |
| **Old Logic** | 0.0 Z-Score | **0.71 Z-Score (FAIL)** | N/A |
| **New Logic** | 0.0 Z-Score | **5.00 Z-Score (PASS)** | **-1.31 Z-Score (RESET)** |



---

**Next Steps:** These architectural changes are fully integrated and tested in `stress_test.ipynb` and `demo_test.ipynb`.