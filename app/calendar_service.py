from datetime import timedelta
from .google_auth import get_calendar_service

CALENDAR_ID = "primary"


def _event_body(task):
    """Build a Google Calendar event dict from a task."""
    if not task.due_date:
        return None

    # If due_date is at exact midnight AND no due_end → all-day event
    is_all_day = (
        task.due_date.hour == 0
        and task.due_date.minute == 0
        and task.due_date.second == 0
        and not task.due_end
    )

    if is_all_day:
        date_str = task.due_date.strftime("%Y-%m-%d")
        next_day = (task.due_date + timedelta(days=1)).strftime("%Y-%m-%d")
        body = {
            "summary": task.title,
            "description": task.notes or "",
            "start": {"date": date_str},
            "end": {"date": next_day},
        }
    else:
        start = task.due_date
        if task.due_end:
            end = task.due_end
        elif task.estimated_minutes:
            end = start + timedelta(minutes=task.estimated_minutes)
        else:
            end = start + timedelta(minutes=30)

        body = {
            "summary": task.title,
            "description": task.notes or "",
            "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
        }

    # Priority colors
    if task.priority == "urgent":
        body["colorId"] = "11"
    elif task.priority == "high":
        body["colorId"] = "6"
    elif task.priority == "low":
        body["colorId"] = "2"

    return body


def push_task(db, task) -> str | None:
    """Push task to Calendar using the task owner's tokens."""
    from . import models
    user = db.query(models.User).get(task.user_id)
    if not user:
        return None

    service = get_calendar_service(user, db)
    if not service:
        return None

    body = _event_body(task)
    if not body:
        return None

    try:
        if task.calendar_event_id:
            service.events().update(
                calendarId=CALENDAR_ID,
                eventId=task.calendar_event_id,
                body=body,
            ).execute()
            return task.calendar_event_id
        else:
            event = service.events().insert(
                calendarId=CALENDAR_ID,
                body=body,
            ).execute()
            return event.get("id")
    except Exception as e:
        print(f"[Calendar] push failed: {e}")
        return None


def delete_event(db, event_id: str):
    if not event_id:
        return
    # NOTE: Deleting requires user context. Left as no-op — stale events
    # can be cleaned manually from Google Calendar.
    pass