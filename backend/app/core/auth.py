"""Supabase JWT verification.

Supabase issues an access token (a JWT) when a user signs in. The frontend
sends it as ``Authorization: Bearer <token>``. This module verifies it:

* Projects on the newer asymmetric signing keys (ES256 / RS256) are verified
  against the project's public JWKS endpoint.
* Projects still on the legacy shared secret (HS256) are verified with
  ``SUPABASE_JWT_SECRET``.

``SupabaseAuthMiddleware`` runs the check for every ``/api`` route except the
public ones and stores the verified user on ``request.state.user``. Routes read
it through the ``get_current_user`` dependency.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import jwt
from fastapi import HTTPException, Request, status
from jwt import PyJWKClient
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.core.config import Settings, get_settings

ASYMMETRIC_ALGORITHMS = ["ES256", "RS256"]

# Paths that never need a token. Matched by exact path or by prefix.
PUBLIC_PATHS = {"/api/health"}
PUBLIC_PREFIXES = ("/docs", "/redoc", "/openapi.json")


class AuthError(Exception):
    """Raised when a token is missing, malformed, expired or not trusted."""


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None
    role: str
    claims: dict[str, Any] = field(repr=False)


_jwks_clients: dict[str, PyJWKClient] = {}


def _jwks_client(url: str) -> PyJWKClient:
    client = _jwks_clients.get(url)
    if client is None:
        client = PyJWKClient(url, cache_keys=True, lifespan=600)
        _jwks_clients[url] = client
    return client


def verify_supabase_token(token: str, settings: Settings | None = None) -> AuthenticatedUser:
    settings = settings or get_settings()

    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise AuthError("Malformed token") from exc

    alg = header.get("alg")
    options = {"require": ["exp", "sub"]}
    issuer = settings.supabase_issuer or None

    try:
        if alg == "HS256":
            if not settings.supabase_jwt_secret:
                raise AuthError("HS256 tokens are not accepted: SUPABASE_JWT_SECRET is not set")
            claims = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience=settings.supabase_jwt_audience,
                issuer=issuer,
                options=options,
            )
        elif alg in ASYMMETRIC_ALGORITHMS:
            if not settings.supabase_jwks_url:
                raise AuthError("SUPABASE_URL is not set, so signing keys cannot be fetched")
            signing_key = _jwks_client(settings.supabase_jwks_url).get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=ASYMMETRIC_ALGORITHMS,
                audience=settings.supabase_jwt_audience,
                issuer=issuer,
                options=options,
            )
        else:
            raise AuthError(f"Unsupported token algorithm: {alg}")
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token has expired") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid token") from exc

    return AuthenticatedUser(
        id=claims["sub"],
        email=claims.get("email"),
        role=claims.get("role", "authenticated"),
        claims=claims,
    )


def _is_public(path: str) -> bool:
    return path in PUBLIC_PATHS or path.startswith(PUBLIC_PREFIXES) or not path.startswith("/api")


def _unauthorized(detail: str) -> JSONResponse:
    return JSONResponse(
        {"detail": detail},
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Bearer"},
    )


class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # CORS preflight requests never carry credentials.
        if request.method == "OPTIONS" or _is_public(request.url.path):
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        scheme, _, token = auth_header.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return _unauthorized("Missing bearer token")

        try:
            # Run in a thread: the first call may fetch signing keys over the network.
            request.state.user = await run_in_threadpool(verify_supabase_token, token.strip())
        except AuthError as exc:
            return _unauthorized(str(exc))

        return await call_next(request)


def get_current_user(request: Request) -> AuthenticatedUser:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user
