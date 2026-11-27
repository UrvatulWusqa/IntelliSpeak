import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core import config

SECRET = "test-secret-at-least-32-characters-long!!"
SUPABASE_URL = "https://example.supabase.co"


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    config.get_settings.cache_clear()
    from app.main import create_app

    yield TestClient(create_app())
    config.get_settings.cache_clear()


def make_token(**overrides):
    now = int(time.time())
    claims = {
        "sub": "11111111-1111-1111-1111-111111111111",
        "email": "student@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "iss": f"{SUPABASE_URL}/auth/v1",
        "iat": now,
        "exp": now + 3600,
    }
    claims.update(overrides)
    secret = claims.pop("_secret", SECRET)
    return jwt.encode(claims, secret, algorithm="HS256")


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health_is_public(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_protected_route_requires_token(client):
    res = client.get("/api/me")
    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "Bearer"


def test_valid_token_is_accepted(client):
    res = client.get("/api/me", headers=auth(make_token()))
    assert res.status_code == 200
    assert res.json() == {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "student@example.com",
        "role": "authenticated",
    }


@pytest.mark.parametrize(
    "overrides",
    [
        {"exp": int(time.time()) - 10},
        {"aud": "anon"},
        {"iss": "https://evil.example.com/auth/v1"},
        {"_secret": "a-different-secret-that-is-also-long-enough"},
    ],
    ids=["expired", "wrong-audience", "wrong-issuer", "wrong-signature"],
)
def test_bad_tokens_are_rejected(client, overrides):
    res = client.get("/api/me", headers=auth(make_token(**overrides)))
    assert res.status_code == 401


def test_garbage_token_is_rejected(client):
    res = client.get("/api/me", headers=auth("not-a-jwt"))
    assert res.status_code == 401


def test_unknown_api_route_still_requires_token(client):
    assert client.get("/api/does-not-exist").status_code == 401


def test_asymmetric_es256_token_is_verified_with_jwks(client, monkeypatch):
    from cryptography.hazmat.primitives.asymmetric import ec

    from app.core import auth as auth_module

    private_key = ec.generate_private_key(ec.SECP256R1())

    class FakeJWKClient:
        def get_signing_key_from_jwt(self, token):
            return type("Key", (), {"key": private_key.public_key()})()

    monkeypatch.setattr(auth_module, "_jwks_client", lambda url: FakeJWKClient())

    claims = jwt.decode(make_token(), options={"verify_signature": False})
    token = jwt.encode(claims, private_key, algorithm="ES256", headers={"kid": "test"})
    res = client.get("/api/me", headers=auth(token))
    assert res.status_code == 200

    other_key = ec.generate_private_key(ec.SECP256R1())
    forged = jwt.encode(claims, other_key, algorithm="ES256", headers={"kid": "test"})
    assert client.get("/api/me", headers=auth(forged)).status_code == 401
