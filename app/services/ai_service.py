import os
import json
from openai import OpenAI
from datetime import datetime

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "sk-placeholder"))

def parse_natural_language(text: str) -> dict:
    today = datetime.now().isoformat()
    prompt = f"""Extract task details from this text. Today is {today}.
Text: "{text}"
Return ONLY JSON with keys: title, priority (low/medium/high/urgent),
tags (comma-separated), due_date (ISO8601 or null),
estimated_minutes (int or null), notes (string)."""
    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(r.choices[0].message.content)
    except Exception as e:
        # Fallback if no API key or AI is down
        return {
            "title": text,
            "priority": "medium",
            "tags": "",
            "due_date": None,
            "estimated_minutes": None,
            "notes": ""
        }

def breakdown_task(title: str) -> list:
    prompt = f"""Break down this task into 5-8 concrete subtasks:
Task: "{title}"
Return ONLY JSON: {{"subtasks": ["...", "..."]}}"""
    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(r.choices[0].message.content)["subtasks"]
    except Exception:
        return ["Research", "Plan", "Execute", "Review", "Finish"]

def daily_briefing(tasks: list) -> str:
    summary = "\n".join([f"- {t['title']} (priority {t['priority']})" for t in tasks])
    prompt = f"""Give a short, motivating daily briefing based on these tasks.
Max 3 sentences. Be warm but efficient.
Tasks:\n{summary}"""
    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return r.choices[0].message.content
    except Exception:
        return f"You have {len(tasks)} tasks today. Focus on the top one first. You've got this ✨"