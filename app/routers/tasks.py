from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from .. import models, schemas, calendar_service
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=List[schemas.TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Task)
        .filter(models.Task.user_id == user.id)
        .order_by(models.Task.order)
        .all()
    )


@router.post("/", response_model=schemas.TaskOut)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    max_order = (
        db.query(models.Task).filter(models.Task.user_id == user.id).count()
    )
    task = models.Task(**payload.model_dump(), order=max_order, user_id=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)

    if task.due_date:
        event_id = calendar_service.push_task(db, task)
        if event_id:
            task.calendar_event_id = event_id
            db.commit()
            db.refresh(task)

    return task


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(404, "Not found")

    data = payload.model_dump(exclude_unset=True)
    if data.get("completed") is True and not task.completed:
        task.completed_at = datetime.utcnow()
    if data.get("completed") is False:
        task.completed_at = None

    for k, v in data.items():
        setattr(task, k, v)

    db.commit()
    db.refresh(task)

    if task.due_date:
        event_id = calendar_service.push_task(db, task)
        if event_id and event_id != task.calendar_event_id:
            task.calendar_event_id = event_id
            db.commit()
            db.refresh(task)
    elif task.calendar_event_id:
        calendar_service.delete_event(db, task.calendar_event_id)
        task.calendar_event_id = None
        db.commit()
        db.refresh(task)

    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(404, "Not found")

    if task.calendar_event_id:
        calendar_service.delete_event(db, task.calendar_event_id)

    db.delete(task)
    db.commit()
    return {"ok": True}


@router.post("/reorder")
def reorder(
    items: List[schemas.ReorderItem],
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    for item in items:
        t = (
            db.query(models.Task)
            .filter(models.Task.id == item.id, models.Task.user_id == user.id)
            .first()
        )
        if t:
            t.order = item.order
    db.commit()
    return {"ok": True}


@router.post("/{task_id}/subtasks", response_model=schemas.SubtaskOut)
def add_subtask(
    task_id: int,
    payload: schemas.SubtaskBase,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(404, "Not found")

    s = models.Subtask(task_id=task_id, **payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/subtasks/{sub_id}", response_model=schemas.SubtaskOut)
def toggle_subtask(
    sub_id: int,
    payload: schemas.SubtaskBase,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    s = (
        db.query(models.Subtask)
        .join(models.Task)
        .filter(models.Subtask.id == sub_id, models.Task.user_id == user.id)
        .first()
    )
    if not s:
        raise HTTPException(404, "Not found")
    s.title = payload.title
    s.completed = payload.completed
    db.commit()
    db.refresh(s)
    return s