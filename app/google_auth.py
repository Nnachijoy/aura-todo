import os
import base64
import hashlib
import secrets
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from sqlalchemy.orm import Session
from . import models

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    }
}

# Keyed by user_id so each user has their own PKCE verifier
_pkce_store = {}


def _generate_pkce():
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def get_flow():
    return Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri="urn:ietf:wg:oauth:2.0:oob",
    )


def get_auth_url(user_id: int) -> str:
    verifier, challenge = _generate_pkce()
    _pkce_store[user_id] = verifier

    flow = get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        code_challenge=challenge,
        code_challenge_method="S256",
    )
    return auth_url


def exchange_code(code: str, user: models.User, db: Session):
    verifier = _pkce_store.get(user.id)
    if not verifier:
        raise Exception("No PKCE verifier found — get a fresh auth URL.")

    flow = get_flow()
    flow.fetch_token(code=code, code_verifier=verifier)
    creds = flow.credentials

    existing = db.query(models.UserToken).filter_by(user_id=user.id).first()
    if existing:
        existing.access_token = creds.token
        existing.refresh_token = creds.refresh_token or existing.refresh_token
        existing.token_expiry = creds.expiry
    else:
        existing = models.UserToken(
            user_id=user.id,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            token_expiry=creds.expiry,
        )
        db.add(existing)

    try:
        service = build("oauth2", "v2", credentials=creds)
        userinfo = service.userinfo().get().execute()
        existing.email = userinfo.get("email")
        user.email = userinfo.get("email")
    except Exception:
        pass

    db.commit()
    _pkce_store.pop(user.id, None)
    return existing


def get_credentials(user: models.User, db: Session):
    tok = db.query(models.UserToken).filter_by(user_id=user.id).first()
    if not tok:
        return None

    creds = Credentials(
        token=tok.access_token,
        refresh_token=tok.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES,
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            tok.access_token = creds.token
            tok.token_expiry = creds.expiry
            db.commit()
        except Exception:
            return None

    return creds


def get_calendar_service(user: models.User, db: Session):
    creds = get_credentials(user, db)
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds)


def disconnect(user: models.User, db: Session):
    db.query(models.UserToken).filter_by(user_id=user.id).delete()
    db.commit()


def connection_status(user: models.User, db: Session) -> dict:
    tok = db.query(models.UserToken).filter_by(user_id=user.id).first()
    if not tok:
        return {"connected": False, "email": None}
    return {"connected": True, "email": tok.email}