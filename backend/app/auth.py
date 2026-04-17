"""JWT validation and role-based access control for Microsoft Entra ID."""
from __future__ import annotations

import httpx
import jwt
from jwt.algorithms import RSAAlgorithm
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .config import get_settings
from .database import get_db
from .models import User, UserRole

security = HTTPBearer(auto_error=False)

# JWKS cache: tenant_id -> list of keys
_jwks_cache: dict[str, list] = {}


async def _fetch_jwks(tenant_id: str) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys",
            timeout=10,
        )
        r.raise_for_status()
        return r.json()["keys"]


async def _get_signing_key(tenant_id: str, kid: str):
    keys = _jwks_cache.get(tenant_id)
    if not keys:
        keys = await _fetch_jwks(tenant_id)
        _jwks_cache[tenant_id] = keys

    key_data = next((k for k in keys if k.get("kid") == kid), None)
    if key_data is None:
        # Refresh cache once and retry
        keys = await _fetch_jwks(tenant_id)
        _jwks_cache[tenant_id] = keys
        key_data = next((k for k in keys if k.get("kid") == kid), None)

    if key_data is None:
        raise HTTPException(status_code=401, detail="Unknown signing key")

    return RSAAlgorithm.from_jwk(key_data)


async def _validate_token(token: str) -> dict:
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.exceptions.DecodeError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    public_key = await _get_signing_key(settings.azure_tenant_id, header.get("kid", ""))

    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            # Accept both bare GUID and api:// URI as audience
            audience=[settings.azure_client_id, f"api://{settings.azure_client_id}"],
            options={"verify_exp": True},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    settings = get_settings()

    if not settings.auth_enabled:
        # Dev mode: return an in-memory admin user (no DB required)
        return User(
            id=0,
            azure_oid="dev",
            email="dev@local",
            display_name="Dev Admin",
            role=UserRole.admin.value,
            is_active=True,
        )

    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    claims = await _validate_token(credentials.credentials)

    oid = claims.get("oid") or claims.get("sub", "")
    email = claims.get("preferred_username") or claims.get("email") or ""
    display_name = claims.get("name") or email

    result = await db.execute(select(User).where(User.azure_oid == oid))
    user = result.scalar_one_or_none()

    if user is None:
        # First user ever becomes admin; everyone else starts as reader
        count_result = await db.execute(select(func.count(User.id)))
        count = count_result.scalar() or 0
        role = UserRole.admin.value if count == 0 else UserRole.reader.value
        user = User(azure_oid=oid, email=email, display_name=display_name, role=role)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    else:
        if user.email != email or user.display_name != display_name:
            user.email = email
            user.display_name = display_name
            await db.commit()

    return user


def require_roles(*roles: str):
    """Dependency factory: raises 403 if the current user's role is not in roles."""
    async def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep
