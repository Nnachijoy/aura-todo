from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .database import get_db
from . import models


def get_current_user(
    x_session_id: str = Header(..., alias="X-Session-Id"),
    db: Session = Depends(get_db),
) -> models.User:
    """Get (or create) the user for this browser session."""
    if not x_session_id or len(x_session_id) < 10:
        raise HTTPException(400, "Missing or invalid session id")

    user = db.query(models.User).filter_by(session_id=x_session_id).first()
    if not user:
        user = models.User(session_id=x_session_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user