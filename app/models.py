from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    session_id = Column(String, unique=True, index=True)  # random id from browser
    email = Column(String, nullable=True)                 # from Google, if connected
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # ← owner
    title = Column(String, nullable=False)
    notes = Column(Text, default="")
    completed = Column(Boolean, default=False)
    status = Column(String, default="todo")
    priority = Column(String, default="medium")
    tags = Column(String, default="")
    due_date = Column(DateTime, nullable=True)
    due_end = Column(DateTime, nullable=True)
    reminder_at = Column(DateTime, nullable=True)
    order = Column(Integer, default=0)
    estimated_minutes = Column(Integer, nullable=True)
    recurrence = Column(String, nullable=True)
    calendar_event_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete")


class Subtask(Base):
    __tablename__ = "subtasks"
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    task = relationship("Task", back_populates="subtasks")


class UserToken(Base):
    __tablename__ = "user_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # ← one per user
    provider = Column(String, default="google")
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expiry = Column(DateTime, nullable=True)
    email = Column(String, nullable=True)
    connected_at = Column(DateTime, default=datetime.utcnow)