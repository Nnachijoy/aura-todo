# Aura — 

A full-stack AI-powered to-do app with Google Calendar sync.

## ✨ Features
- Smart tasks with notes, subtasks, priorities, due dates, time ranges
- Three views: List, Kanban Board, Calendar
- Focus mode — Pomodoro timer
- Stats — charts, streaks, insights
- AI: natural language parsing, subtask breakdown, daily briefing
- Google Calendar sync
- Multi-user (session-based)
- Light + dark themes
- Command palette (Ctrl+K)

## 🛠️ Tech Stack
- Backend: Python, FastAPI, SQLAlchemy, SQLite
- Frontend: React, Vite, Tailwind CSS, Framer Motion, Recharts
- AI: OpenAI GPT-4o-mini
- Integrations: Google Calendar API (OAuth 2.0 with PKCE)

## 🚀 How to Run
### Backend
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload