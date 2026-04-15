"""
Voice conversation turn routes — POST /voice-turns, GET /voice-turns/{user_id}
"""

from typing import List
from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import (
    VoiceTurnRequest,
    VoiceTurnResponse,
    VoiceTurnsListResponse,
)

router = APIRouter(prefix="/voice-turns", tags=["voice-turns"])


@router.post("", response_model=VoiceTurnResponse)
def create_voice_turn(body: VoiceTurnRequest):
    """
    Store a single conversation turn (user + agent) with timing data.
    """
    try:
        # Calculate durations in ms
        user_duration_ms = None
        if body.user_start and body.user_end:
            user_duration_ms = int((body.user_end - body.user_start).total_seconds() * 1000)

        agent_duration_ms = None
        if body.agent_start and body.agent_end:
            agent_duration_ms = int((body.agent_end - body.agent_start).total_seconds() * 1000)

        row = {
            "user_id": body.user_id,
            "user_text": body.user_text,
            "agent_text": body.agent_text,
            "user_start": body.user_start.isoformat() if body.user_start else None,
            "user_end": body.user_end.isoformat() if body.user_end else None,
            "agent_start": body.agent_start.isoformat() if body.agent_start else None,
            "agent_end": body.agent_end.isoformat() if body.agent_end else None,
            "user_duration_ms": user_duration_ms,
            "agent_duration_ms": agent_duration_ms,
        }

        result = dependencies.supabase.table("voice_conversation_turns").insert(row).execute()
        inserted = result.data[0]

        return VoiceTurnResponse(
            id=inserted["id"],
            user_id=inserted["user_id"],
            created_at=inserted.get("created_at"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save voice turn: {e}")


@router.get("/{user_id}", response_model=VoiceTurnsListResponse)
def get_voice_turns(user_id: int):
    """
    Return all conversation turns for a given user, newest first.
    """
    try:
        result = (
            dependencies.supabase.table("voice_conversation_turns")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return VoiceTurnsListResponse(user_id=user_id, turns=result.data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch voice turns: {e}")
