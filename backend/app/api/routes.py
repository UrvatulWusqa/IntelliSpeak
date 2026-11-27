from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import get_settings

router = APIRouter(prefix="/api")


@router.get("/health", tags=["system"])
def health() -> dict:
    """Public liveness check. Does not require a token."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/me", tags=["auth"])
def me(user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    """Returns the caller's identity from their verified Supabase token."""
    return {"id": user.id, "email": user.email, "role": user.role}
