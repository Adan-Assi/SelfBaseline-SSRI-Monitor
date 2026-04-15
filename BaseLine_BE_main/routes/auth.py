"""
Auth routes — POST /auth/login
"""

import hashlib

from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """
    Authenticate with username + password.
    Returns user_id, role and username.
    """
    result = (
        dependencies.supabase.table("users")
        .select("id, role, username, password_hash, is_active")
        .eq("username", body.username)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = result.data[0]

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Simple hash check (same hashing used in user creation)
    hashed = hashlib.sha256(body.password.encode()).hexdigest()
    if hashed != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return LoginResponse(
        user_id=user["id"],
        role=user["role"],
        username=user["username"],
    )
