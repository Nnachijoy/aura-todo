from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class SubtaskBase(BaseModel):
    title: str
    completed: bool = False


class SubtaskOut(SubtaskBase):
    id: int

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str
    notes: Optional[str] = ""
    priority: Optional[str] = "medium"
    tags: Optional[str] = ""
    due_date: Optional[datetime] = None
    due_end: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    estimated_minutes: Optional[int] = None
    recurrence: Optional[str] = None
    status: Optional[str] = "todo"


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[datetime] = None
    due_end: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    order: Optional[int] = None
    estimated_minutes: Optional[int] = None
    recurrence: Optional[str] = None
    status: Optional[str] = None


class TaskOut(TaskBase):
    id: int
    completed: bool
    order: int
    created_at: datetime
    completed_at: Optional[datetime]
    subtasks: List[SubtaskOut] = []

    class Config:
        from_attributes = True


class ReorderItem(BaseModel):
    id: int
    order: int


class NLParseRequest(BaseModel):
    text: str


class BreakdownRequest(BaseModel):
    title: str