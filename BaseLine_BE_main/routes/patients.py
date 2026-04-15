"""
Patient routes
  POST  /patient/details
  GET   /patient/dashboard/{user_id}
  GET   /patient/provider-link/{user_id}
  POST  /patient/provider-link
"""

from datetime import date, timedelta

from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import (
    CaregiverInfo,
    CreateProviderLinkRequest,
    DoctorInfo,
    PatientDashboardResponse,
    PatientDetailsRequest,
    ProviderLinkResponse,
)

router = APIRouter(prefix="/patient", tags=["patient"])


# ── POST /patient/details ───────────────────────────────────────────
@router.post("/details")
def upsert_patient_details(body: PatientDetailsRequest):
    """Upsert patient profile details."""
    payload = {
        "user_id": body.user_id,
        "full_name": body.full_name,
    }
    if body.birth_date is not None:
        payload["birth_date"] = body.birth_date.isoformat()
    if body.checkin_time is not None:
        payload["checkin_time"] = body.checkin_time

    try:
        result = (
            dependencies.supabase.table("patient_details")
            .upsert(payload, on_conflict="user_id")
            .execute()
        )
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── GET /patient/dashboard/{user_id} ────────────────────────────────
@router.get("/dashboard/{user_id}", response_model=PatientDashboardResponse)
def get_patient_dashboard(user_id: int):
    """
    Return patient dashboard info including streak count.
    Streak = consecutive days with a completed check-in up to today.
    """
    # 1. Patient profile
    profile = (
        dependencies.supabase.table("patient_details")
        .select("full_name, birth_date, checkin_time")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = profile.data[0]

    # 2. Streak calculation — get all session dates ordered descending
    sessions = (
        dependencies.supabase.table("checkin_sessions")
        .select("session_date")
        .eq("patient_user_id", user_id)
        .order("session_date", desc=True)
        .execute()
    )

    streak = _calculate_streak([s["session_date"] for s in sessions.data])

    # 3. Next check-in
    next_checkin = patient.get("checkin_time")  # simple: just the configured time

    return PatientDashboardResponse(
        full_name=patient["full_name"],
        birth_date=patient.get("birth_date"),
        streak_count=streak,
        next_checkin=next_checkin,
    )


def _calculate_streak(dates_desc: list[str]) -> int:
    """Count consecutive days ending at today (or yesterday if today not done yet)."""
    if not dates_desc:
        return 0

    today = date.today()
    streak = 0
    expected = today

    for d in dates_desc:
        session_date = date.fromisoformat(d)
        if session_date == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif session_date < expected:
            break  # gap found

    return streak


# ── GET /patient/provider-link/{user_id} ─────────────────────────────
@router.get("/provider-link/{user_id}", response_model=ProviderLinkResponse)
def get_provider_link(user_id: int):
    """Return the patient's doctor & caregiver info."""
    link = (
        dependencies.supabase.table("patient_provider_link")
        .select("doctor_id, caregiver_id")
        .eq("patient_id", user_id)
        .limit(1)
        .execute()
    )

    if not link.data:
        return ProviderLinkResponse()

    row = link.data[0]

    # Doctor
    doctor_info = None
    doc = (
        dependencies.supabase.table("doctor_details")
        .select("full_name, phone_number")
        .eq("user_id", row["doctor_id"])
        .limit(1)
        .execute()
    )
    if doc.data:
        d = doc.data[0]
        doctor_info = DoctorInfo(name=d["full_name"], phone=d.get("phone_number"))

    # Caregiver
    caregiver_info = None
    cg = (
        dependencies.supabase.table("caregivers")
        .select("full_name, phone_number, relationship")
        .eq("id", row["caregiver_id"])
        .limit(1)
        .execute()
    )
    if cg.data:
        c = cg.data[0]
        caregiver_info = CaregiverInfo(
            name=c["full_name"],
            phone=c.get("phone_number"),
            relation=c.get("relationship"),
        )

    return ProviderLinkResponse(doctor=doctor_info, caregiver=caregiver_info)


# ── POST /patient/provider-link ──────────────────────────────────────
@router.post("/provider-link")
def create_provider_link(body: CreateProviderLinkRequest):
    """Create caregiver record, then link patient → doctor + caregiver."""
    # 1. Create caregiver
    try:
        cg_result = (
            dependencies.supabase.table("caregivers")
            .insert({
                "full_name": body.caregiver.name,
                "phone_number": body.caregiver.phone,
                "relationship": body.caregiver.relation,
            })
            .execute()
        )
        caregiver_id = cg_result.data[0]["id"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Caregiver creation failed: {e}")

    # 2. Create link
    try:
        link_result = (
            dependencies.supabase.table("patient_provider_link")
            .upsert({
                "patient_id": body.patient_id,
                "doctor_id": body.doctor_id,
                "caregiver_id": caregiver_id,
            }, on_conflict="patient_id")
            .execute()
        )
        return link_result.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Link creation failed: {e}")
