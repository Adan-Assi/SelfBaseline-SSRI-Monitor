"""
User routes — POST /users  ·  GET /users
"""

import hashlib

from fastapi import APIRouter, HTTPException

import dependencies
from routes.schemas import CreateUserRequest, UserResponse

router = APIRouter(tags=["users"])


@router.post("/users", response_model=UserResponse)
def create_user(body: CreateUserRequest):
    """Create a new user (PATIENT / DOCTOR / ADMIN)."""
    password_hash = hashlib.sha256(body.password.encode()).hexdigest()

    try:
        result = (
            dependencies.supabase.table("users")
            .insert({
                "username": body.username,
                "email": body.email,
                "password_hash": password_hash,
                "role": body.role.value,
            })
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = result.data[0]
    return UserResponse(
        id=user["id"],
        role=user["role"],
        username=user["username"],
        email=user["email"],
        is_active=user["is_active"],
    )


@router.get("/users")
def get_users():
    """Return all users."""
    try:
        result = dependencies.supabase.table("users").select("id, role, username, email, is_active").execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
