"""
Check-in routes — POST /checkin/submit
"""

from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import CheckinSubmitRequest, CheckinSubmitResponse

router = APIRouter(prefix="/checkin", tags=["checkin"])


@router.post("/submit", response_model=CheckinSubmitResponse)
def submit_checkin(body: CheckinSubmitRequest):
    """
    Create one checkin_session and N response rows in a single logical transaction.
    Enforces: one session per patient per date (via DB unique constraint).
    """
    # 1. Create session
    try:
        session_result = (
            dependencies.supabase.table("checkin_sessions")
            .insert({
                "patient_user_id": body.patient_user_id,
                "session_date": body.session_date.isoformat(),
            })
            .execute()
        )
    except Exception as e:
        # Unique constraint violation → already checked in today
        raise HTTPException(
            status_code=409,
            detail=f"Check-in already exists for this date: {e}",
        )

    session_id = session_result.data[0]["id"]

    # 2. Build response rows
    rows = []
    for ans in body.answers:
        row = {
            "session_id": session_id,
            "question_id": ans.question_id,
        }
        if ans.numeric_value is not None:
            row["numeric_value"] = ans.numeric_value
        if ans.option_id is not None:
            row["option_id"] = ans.option_id
        if ans.text_value is not None:
            row["text_value"] = ans.text_value
        rows.append(row)

    # 3. Bulk insert responses
    try:
        dependencies.supabase.table("responses").insert(rows).execute()
    except Exception as e:
        # Clean up the session if responses fail
        dependencies.supabase.table("checkin_sessions").delete().eq("id", session_id).execute()
        raise HTTPException(status_code=400, detail=f"Failed to save responses: {e}")

    return CheckinSubmitResponse(
        session_id=session_id,
        responses_saved=len(rows),
    )
