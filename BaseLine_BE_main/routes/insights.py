"""
Insights & Agent-prompt routes

GET /insights/{user_id}       → 2 patient-facing insights (for home page)
GET /agent-prompt/{user_id}   → system instruction for the voice agent
"""

import json
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException
from vertexai.generative_models import GenerativeModel

import dependencies
from routes.schemas import (
    AgentPromptResponse,
    InsightsResponse,
    SessionSummary,
    SessionSummaryAnswer,
)

router = APIRouter(tags=["insights"])


# ═════════════════════════════════════════════════════════════════════
#  SHARED HELPERS
# ═════════════════════════════════════════════════════════════════════

def _build_choice_label_map() -> dict[int, str]:
    """Return {option_id: label} for all choice options."""
    rows = dependencies.supabase.table("choice_options").select("id, label").execute()
    return {r["id"]: r["label"] for r in rows.data}


def _build_question_map() -> dict[int, dict]:
    """Return {question_id: {text, type}} for all questions."""
    rows = (
        dependencies.supabase.table("questions")
        .select("id, text, type")
        .execute()
    )
    return {r["id"]: {"text": r["text"], "type": r["type"]} for r in rows.data}


def _resolve_answer(response_row: dict, question_map: dict, choice_map: dict) -> str:
    """Turn a raw response row into a human-readable answer string."""
    q = question_map.get(response_row["question_id"], {})
    q_type = q.get("type", "")

    if q_type == "SLIDER":
        return str(response_row.get("numeric_value", ""))
    elif q_type == "CHOICE":
        option_id = response_row.get("option_id")
        return choice_map.get(option_id, f"option {option_id}")
    elif q_type == "BOOLEAN":
        val = response_row.get("numeric_value")
        return "Yes" if val == 1 else "No" if val == 0 else str(val)
    elif q_type == "TEXT":
        return response_row.get("text_value", "")
    return str(response_row.get("numeric_value") or response_row.get("text_value") or "")


def _aggregate_weekly_data(user_id: int) -> tuple[str, list[SessionSummary], str]:
    """
    Shared data-fetching logic used by both endpoints.
    Returns (patient_name, session_summaries, full_summary_text).
    """
    supabase = dependencies.supabase

    # 1. Patient name
    patient = (
        supabase.table("patient_details")
        .select("full_name")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not patient.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_name = patient.data[0]["full_name"]

    # 2. Sessions from the last 7 days
    today = date.today()
    week_ago = today - timedelta(days=7)

    sessions = (
        supabase.table("checkin_sessions")
        .select("id, session_date")
        .eq("patient_user_id", user_id)
        .gte("session_date", week_ago.isoformat())
        .lte("session_date", today.isoformat())
        .order("session_date")
        .execute()
    )

    if not sessions.data:
        raise HTTPException(status_code=404, detail="No check-in sessions in the last 7 days")

    session_ids = [s["id"] for s in sessions.data]

    # 3. All responses for those sessions
    responses = (
        supabase.table("responses")
        .select("session_id, question_id, numeric_value, option_id, text_value")
        .in_("session_id", session_ids)
        .execute()
    )

    # 4. Look-up maps
    question_map = _build_question_map()
    choice_map = _build_choice_label_map()

    # 5. Group responses by session
    session_date_map = {s["id"]: s["session_date"] for s in sessions.data}
    grouped: dict[int, list] = {sid: [] for sid in session_ids}
    for r in responses.data:
        grouped[r["session_id"]].append(r)

    # 6. Build human-readable session summaries
    session_summaries: list[SessionSummary] = []
    summary_text_lines: list[str] = []

    for sid in session_ids:
        s_date = session_date_map[sid]
        answers: list[SessionSummaryAnswer] = []
        line = f"Session on {s_date}:"

        for r in grouped[sid]:
            q_info = question_map.get(r["question_id"], {})
            q_text = q_info.get("text", f"Question {r['question_id']}")
            a_text = _resolve_answer(r, question_map, choice_map)
            answers.append(SessionSummaryAnswer(question=q_text, answer=a_text))
            line += f"\n  - {q_text}: {a_text}"

        session_summaries.append(SessionSummary(session_date=s_date, answers=answers))
        summary_text_lines.append(line)

    full_summary = f"Patient: {patient_name}\n\n" + "\n\n".join(summary_text_lines)

    return patient_name, session_summaries, full_summary


def _ask_gemini(prompt: str) -> dict:
    """Send a prompt to Gemini and return the parsed JSON response."""
    model = GenerativeModel("gemini-2.0-flash-lite-001")
    gemini_response = model.generate_content(prompt)
    raw = gemini_response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]

    return json.loads(raw)


# ═════════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — Patient-facing insights (home page)
# ═════════════════════════════════════════════════════════════════════

@router.get("/insights/{user_id}", response_model=InsightsResponse)
def get_insights(user_id: int):
    """Return 2 warm, patient-facing insights based on last week's check-ins."""
    patient_name, session_summaries, full_summary = _aggregate_weekly_data(user_id)

    prompt = f"""You are a mental-health analytics assistant.
Below is a patient's check-in data from the last week.

{full_summary}

Based on this data, return a JSON object (and nothing else) with exactly this key:
- "insights": an array of exactly 2 strings, each a single-sentence insight written directly TO the patient in a warm, friendly second-person tone (use "you" / "your"). These will be shown on the patient's dashboard, so they should feel personal and encouraging — not clinical or third-person."""

    try:
        parsed = _ask_gemini(prompt)
        insights = parsed.get("insights", [])[:2]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini analysis failed: {e}")

    return InsightsResponse(
        patient_name=patient_name,
        sessions=session_summaries,
        insights=insights,
    )


# ═════════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — Agent system instruction (voice page)
# ═════════════════════════════════════════════════════════════════════

@router.get("/agent-prompt/{user_id}", response_model=AgentPromptResponse)
def get_agent_prompt(user_id: int):
    """Generate a personalised system instruction for the ADK voice agent."""
    patient_name, _, full_summary = _aggregate_weekly_data(user_id)

    prompt = f"""You are a mental-health analytics assistant.
Below is a patient's check-in data from the last week.

{full_summary}

Based on this data, return a JSON object (and nothing else) with exactly this key:
- "agent_prompt": a system instruction string that will be injected into a voice agent's instructions (Google ADK Agent). This instruction should give the agent all the context it needs about the patient: their name, what their recent check-in data shows, specific patterns or concerns you noticed, and guidance on what topics to gently explore in conversation. Do NOT write a greeting or a message to the patient — write an instruction TO the agent so it knows the patient's context and can start a warm, informed, supportive conversation on its own."""

    try:
        parsed = _ask_gemini(prompt)
        agent_prompt = parsed.get("agent_prompt", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini analysis failed: {e}")

    return AgentPromptResponse(
        patient_name=patient_name,
        agent_prompt=agent_prompt,
    )



# instruction = (
#     "You are a supportive mental-health voice agent. "
#     "Start a warm conversation with the patient based on the following context:\n\n"
#     + agent_prompt  # ← from the /insights response
# )