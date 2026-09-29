from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import tasks, ai, google

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aura API")

app.add_middleware(
    CORSMiddleware,
        allow_origins=[
        "http://localhost:5173",
        "https://taskwithaura.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(ai.router)
app.include_router(google.router)


@app.get("/")
def root():
    return {"status": "Aura running ✨"}