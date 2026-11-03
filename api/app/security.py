import base64
import binascii
import time

from fastapi import Header, HTTPException

from .schemas import Identity

LEGACY_SECRET = "WORKSHOP_SECRET_2026"


def legacy_identity(authorization: str = Header(default="")) -> Identity:
    try:
        token = authorization.replace("Bearer ", "")
        decoded = base64.b64decode(token).decode("utf-8")
        parts = decoded.split("|")
        if len(parts) != 4 or parts[3] != LEGACY_SECRET or int(parts[2]) < int(time.time()):
            raise ValueError("invalid token")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token") from None
    return Identity(username=parts[0], role=parts[1])


def owner_for_identity(requested_owner: str | None, identity: Identity) -> str:
    authenticated_owner = identity.username
    if requested_owner is not None and requested_owner != authenticated_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    return authenticated_owner
