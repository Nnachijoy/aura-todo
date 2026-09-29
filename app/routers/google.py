from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user
from .. import google_auth, models

router = APIRouter(prefix="/google", tags=["google"])


class CodePayload(BaseModel):
    code: str


@router.get("/status")
def status(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return google_auth.connection_status(user, db)


@router.get("/auth-url")
def auth_url(user: models.User = Depends(get_current_user)):
    return {"url": google_auth.get_auth_url(user.id)}


@router.post("/exchange")
def exchange(
    payload: CodePayload,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        tok = google_auth.exchange_code(payload.code.strip(), user, db)
    except Exception as e:
        raise HTTPException(400, f"Exchange failed: {e}")
    return {"connected": True, "email": tok.email}


@router.post("/disconnect")
def disconnect(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    google_auth.disconnect(user, db)
    return {"connected": False}