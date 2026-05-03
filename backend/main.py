from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_RAW_LEVEL = (os.getenv("LOG_LEVEL") or "INFO").upper()
_LEVEL = getattr(logging, _RAW_LEVEL, None)
if not isinstance(_LEVEL, int):
    _LEVEL = logging.INFO
logging.basicConfig(
    level=_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

from app.database.database import create_tables  # noqa: E402
from app.routes import (  # noqa: E402
    ai,
    author,
    bot,
    favourites,
    lessons,
    progress,
    uploads,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Жобалық оқыту API",
    description="Backend for the project-based learning Mini App (lab previews).",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(lessons.router)
app.include_router(progress.router)
app.include_router(favourites.router)
app.include_router(author.router)
app.include_router(ai.router)
app.include_router(uploads.router)
app.include_router(bot.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8001")),
    )
