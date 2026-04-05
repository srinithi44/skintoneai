"""
Auth route - verifies Supabase JWT tokens server-side.
The primary auth flow (signup/login) happens via Supabase JS on the frontend.
This router provides server-side token verification for protected routes.
"""
import os
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

router = APIRouter()
security = HTTPBearer()

# Initialize Supabase admin client (uses service role key)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase_admin() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ─── Models ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str


# ─── Dependency: Verify Supabase JWT ─────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify the Supabase JWT token and return the user payload."""
    token = credentials.credentials
    supabase = get_supabase_admin()
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Could not validate credentials: {str(e)}")


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest):
    """Register a new user via Supabase Auth."""
    supabase = get_supabase_admin()
    try:
        # Create auth user
        auth_response = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,  # Auto-confirm for demo; set to False for email verification
            "user_metadata": {"full_name": body.full_name}
        })

        user = auth_response.user
        if not user:
            raise HTTPException(status_code=400, detail="Registration failed")

        # Upsert profile record
        supabase.table("profiles").upsert({
            "id": user.id,
            "email": user.email,
            "full_name": body.full_name
        }).execute()

        return {
            "message": "User registered successfully",
            "user_id": user.id,
            "email": user.email
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=400, detail=f"Registration error: {error_msg}")


@router.post("/login")
async def login(body: LoginRequest):
    """
    Login endpoint — primarily handled on frontend via Supabase JS.
    This endpoint can be used for server-side token generation if needed.
    """
    supabase = get_supabase_admin()
    try:
        # Use anonymous (anon) client for user login
        anon_key = os.getenv("SUPABASE_ANON_KEY")
        anon_client = create_client(SUPABASE_URL, anon_key)
        response = anon_client.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })

        session = response.session
        user = response.user

        if not session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "expires_in": session.expires_in,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.user_metadata.get("full_name", "")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    supabase = get_supabase_admin()
    try:
        profile = supabase.table("profiles").select("*").eq("id", current_user.id).single().execute()
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": profile.data.get("full_name", "") if profile.data else "",
            "created_at": current_user.created_at
        }
    except Exception:
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.user_metadata.get("full_name", ""),
        }


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    """Invalidate the user's session (logout handled primarily on frontend)."""
    return {"message": "Logged out successfully"}
