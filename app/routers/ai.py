from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import schemas, models
from ..database import get_db
from ..auth import get_current_user
from ..services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/parse")
def parse(req: schemas.NLParseRequest):
    return ai_service.parse_natural_language(req.text)


@router.post("/breakdown")
def breakdown(req: schemas.BreakdownRequest):
    return {"subtasks": ai_service.breakdown_task(req.title)}


@router.get("/briefing")
def briefing(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    # Only uncompleted tasks for THIS user
    tasks = (
        db.query(models.Task)
        .filter(
            models.Task.user_id == user.id,
            models.Task.completed == False,
        )
        .all()
    )

    # No open tasks → celebrate
    if not tasks:
        return {"briefing": "All clear! Nothing left to do 🎉"}

    n = len(tasks)
    plural = "task" if n == 1 else "tasks"

    priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    top = sorted(
        tasks,
        key=lambda t: priority_order.get(t.priority or "medium", 9),
    )[0]

    return {
        "briefing": f"You have {n} open {plural}. Top one: “{top.title}”. You've got this ✨"
    }