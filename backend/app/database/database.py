"""SQLite-backed engine + session, with idempotent table creation, lightweight
ALTER-TABLE migrations, and seed data for default subjects and the lesson
catalogue (loaded from seeds/lessons.json).
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.database.models import (
    Base,
    Lesson,
    LessonBlock,
    LessonVideo,
    Subject,
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stem_theory_bot.db")
# Railway / Heroku-style DATABASE_URL ships with the legacy `postgres://`
# prefix that SQLAlchemy 2.x rejects.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://") :]

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Iterable[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- migrations -------------------------------------------------------------

_SQLITE_MIGRATIONS: list[tuple[str, str, str]] = [
    ("lessons", "is_featured", "BOOLEAN DEFAULT 0"),
    ("lessons", "estimated_minutes", "INTEGER"),
    ("lessons", "references", "JSON"),
    ("lessons", "summary_kk", "TEXT"),
    ("lessons", "intro_kk", "TEXT"),
    ("users", "photo_url", "VARCHAR(1000)"),
    ("users", "language_code", "VARCHAR(10)"),
]


def _migrate_sqlite() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    inspector = inspect(engine)
    existing = {t: {c["name"] for c in inspector.get_columns(t)} for t in inspector.get_table_names()}
    with engine.begin() as conn:
        for table, column, ddl in _SQLITE_MIGRATIONS:
            if table not in existing or column in existing[table]:
                continue
            logger.info("Migrating %s: adding column %s", table, column)
            conn.execute(text(f'ALTER TABLE {table} ADD COLUMN "{column}" {ddl}'))


# --- seeds ------------------------------------------------------------------

_DEFAULT_SUBJECTS = [
    {"code": "physics", "title_kk": "Физика", "icon": "atom", "color": "#4FD1C5", "position": 1},
    {"code": "chemistry", "title_kk": "Химия", "icon": "flask-conical", "color": "#A3E635", "position": 2},
    {"code": "biology", "title_kk": "Биология", "icon": "leaf", "color": "#34D399", "position": 3},
    {"code": "mathematics", "title_kk": "Математика", "icon": "sigma", "color": "#FBBF24", "position": 4},
    {"code": "informatics", "title_kk": "Информатика", "icon": "binary", "color": "#A78BFA", "position": 5},
    {"code": "engineering", "title_kk": "Инженерия", "icon": "cog", "color": "#FB923C", "position": 6},
    {"code": "astronomy", "title_kk": "Астрономия", "icon": "telescope", "color": "#818CF8", "position": 7},
    {"code": "ecology", "title_kk": "Экология", "icon": "trees", "color": "#2DD4BF", "position": 8},
    {"code": "interdisciplinary", "title_kk": "Пәнаралық", "icon": "shapes", "color": "#F472B6", "position": 9},
]


def _seed_subjects(db: Session) -> None:
    if db.query(Subject).count() > 0:
        return
    for s in _DEFAULT_SUBJECTS:
        db.add(Subject(**s))
    db.commit()


_SEED_PATH = Path(__file__).resolve().parent.parent.parent / "seeds" / "lessons.json"


def _seed_lessons(db: Session, path: Path = _SEED_PATH) -> None:
    """Load lessons from seeds/lessons.json. Dedupes by title_kk; existing
    lessons are not overwritten so author UI edits are preserved.
    """
    if not path.exists():
        logger.info("Lesson seed file missing: %s — skipping", path)
        return

    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    existing_titles = {l.title_kk for l in db.query(Lesson).all()}
    inserted = 0

    for entry in raw:
        if entry["title_kk"] in existing_titles:
            continue
        lesson = Lesson(
            title_kk=entry["title_kk"],
            objective_kk=entry.get("objective_kk"),
            summary_kk=entry.get("summary_kk"),
            intro_kk=entry.get("intro_kk"),
            cover_image_url=entry.get("cover_image_url"),
            subject_code=entry["subject_code"],
            difficulty=entry.get("difficulty", "medium"),
            age_range=entry.get("age_range"),
            tags=entry.get("tags") or [],
            references=entry.get("references") or [],
            estimated_minutes=entry.get("estimated_minutes"),
            is_published=entry.get("is_published", True),
            is_featured=entry.get("is_featured", False),
            published_at=datetime.utcnow() if entry.get("is_published", True) else None,
        )
        db.add(lesson)
        db.flush()

        for i, block in enumerate(entry.get("blocks") or []):
            db.add(
                LessonBlock(
                    lesson_id=lesson.id,
                    position=block.get("position", i),
                    type=block["type"],
                    payload=block.get("payload") or {},
                )
            )

        for i, v in enumerate(entry.get("videos") or []):
            db.add(
                LessonVideo(
                    lesson_id=lesson.id,
                    provider=v.get("provider", "youtube"),
                    external_id_or_url=v["external_id_or_url"],
                    title_kk=v.get("title_kk"),
                    duration_sec=v.get("duration_sec"),
                    position=v.get("position", i),
                )
            )

        inserted += 1

    if inserted:
        db.commit()
        logger.info("Lessons seed: inserted=%d", inserted)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite()
    with SessionLocal() as db:
        _seed_subjects(db)
        _seed_lessons(db)
    # Local import to avoid a circular dependency at module import time.
    from app.services.upload_service import seed_bundled_images
    seed_bundled_images()
