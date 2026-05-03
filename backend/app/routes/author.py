from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import (
    BroadcastLog,
    Lesson,
    LessonBlock,
    LessonFavourite,
    LessonProgress,
    User,
)
from app.schemas.lesson import LessonCreate, LessonFull, LessonSummary, LessonUpdate
from app.services import lesson_service
from app.utils.auth import require_author

router = APIRouter(prefix="/api/author", tags=["author"])
logger = logging.getLogger(__name__)


class StatsOut(BaseModel):
    total_lessons: int
    published_lessons: int
    total_views: int
    total_completions: int
    total_favourites: int
    top_lessons: list[dict]


@router.get("/stats", response_model=StatsOut)
def stats(
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(Lesson.id)).scalar() or 0
    published = (
        db.query(func.count(Lesson.id))
        .filter(Lesson.is_published.is_(True))
        .scalar()
        or 0
    )
    views = db.query(func.count(LessonProgress.id)).scalar() or 0
    completions = (
        db.query(func.count(LessonProgress.id))
        .filter(LessonProgress.status == "completed")
        .scalar()
        or 0
    )
    favs = db.query(func.count(LessonFavourite.id)).scalar() or 0

    top_rows = (
        db.query(
            Lesson.id,
            Lesson.title_kk,
            func.count(LessonProgress.id).label("views"),
        )
        .outerjoin(LessonProgress, LessonProgress.lesson_id == Lesson.id)
        .group_by(Lesson.id)
        .order_by(func.count(LessonProgress.id).desc())
        .limit(5)
        .all()
    )
    return StatsOut(
        total_lessons=total,
        published_lessons=published,
        total_views=views,
        total_completions=completions,
        total_favourites=favs,
        top_lessons=[
            {"id": r.id, "title_kk": r.title_kk, "views": r.views} for r in top_rows
        ],
    )


@router.get("/lessons", response_model=list[LessonSummary])
def list_all(
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    return lesson_service.list_lessons(db, include_unpublished=True)


@router.post("/lessons", response_model=LessonFull)
def create(
    payload: LessonCreate,
    user: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    return lesson_service.create_lesson(db, payload, author_id=user.id)


@router.patch("/lessons/{lesson_id}", response_model=LessonFull)
def update(
    lesson_id: int,
    payload: LessonUpdate,
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    lesson = lesson_service.get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson_service.update_lesson(db, lesson, payload)


class StudentSummary(BaseModel):
    user_id: int
    telegram_id: Optional[int]
    first_name: Optional[str]
    last_name: Optional[str]
    username: Optional[str]
    photo_url: Optional[str]
    created_at: Optional[str]
    lessons_opened: int
    lessons_completed: int
    favourites_count: int
    last_seen: Optional[str]


class StudentLessonProgress(BaseModel):
    lesson_id: int
    title_kk: str
    subject_code: str
    total_blocks: int
    status: str
    last_block_position: int
    seconds_spent: int
    opened_at: Optional[str]
    updated_at: Optional[str]
    completed_at: Optional[str]


class StudentFavouriteRow(BaseModel):
    lesson_id: int
    title_kk: str
    subject_code: str
    created_at: Optional[str]


class StudentDetail(BaseModel):
    user_id: int
    telegram_id: Optional[int]
    first_name: Optional[str]
    last_name: Optional[str]
    username: Optional[str]
    photo_url: Optional[str]
    language_code: Optional[str]
    created_at: Optional[str]
    lessons_opened: int
    lessons_completed: int
    progress: list[StudentLessonProgress]
    favourites: list[StudentFavouriteRow]


@router.get("/students", response_model=list[StudentSummary])
def list_students(
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    """Every student that has ever registered, with rolled-up activity
    counters. Sorted by most recent activity first."""
    progress_rows = (
        db.query(
            LessonProgress.user_id,
            func.count(LessonProgress.id).label("opened"),
            func.sum(
                case((LessonProgress.status == "completed", 1), else_=0)
            ).label("completed"),
            func.max(LessonProgress.updated_at).label("last_seen"),
        )
        .group_by(LessonProgress.user_id)
        .all()
    )
    progress_by_user = {
        r.user_id: {"opened": r.opened or 0, "completed": int(r.completed or 0), "last_seen": r.last_seen}
        for r in progress_rows
    }

    fav_rows = (
        db.query(LessonFavourite.user_id, func.count(LessonFavourite.id))
        .group_by(LessonFavourite.user_id)
        .all()
    )
    fav_by_user = {uid: cnt for uid, cnt in fav_rows}

    users = (
        db.query(User)
        .filter(User.role == "student")
        .order_by(User.created_at.desc())
        .all()
    )

    out = []
    for u in users:
        agg = progress_by_user.get(u.id, {"opened": 0, "completed": 0, "last_seen": None})
        out.append(
            StudentSummary(
                user_id=u.id,
                telegram_id=u.telegram_id,
                first_name=u.first_name,
                last_name=u.last_name,
                username=u.username,
                photo_url=u.photo_url,
                created_at=u.created_at.isoformat() if u.created_at else None,
                lessons_opened=agg["opened"],
                lessons_completed=agg["completed"],
                favourites_count=fav_by_user.get(u.id, 0),
                last_seen=agg["last_seen"].isoformat() if agg["last_seen"] else None,
            )
        )

    # Most recently active first; users with no activity slip to the bottom
    # ordered by registration date (already desc above).
    out.sort(
        key=lambda s: (s.last_seen or "0000", s.created_at or "0000"),
        reverse=True,
    )
    return out


@router.get("/students/{user_id}", response_model=StudentDetail)
def get_student(
    user_id: int,
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    block_counts = dict(
        db.query(LessonBlock.lesson_id, func.count(LessonBlock.id))
        .group_by(LessonBlock.lesson_id)
        .all()
    )

    progress_rows = (
        db.query(LessonProgress, Lesson)
        .join(Lesson, Lesson.id == LessonProgress.lesson_id)
        .filter(LessonProgress.user_id == user_id)
        .order_by(LessonProgress.updated_at.desc())
        .all()
    )

    progress = [
        StudentLessonProgress(
            lesson_id=l.id,
            title_kk=l.title_kk,
            subject_code=l.subject_code,
            total_blocks=block_counts.get(l.id, 0),
            status=p.status,
            last_block_position=p.last_block_position,
            seconds_spent=p.seconds_spent,
            opened_at=p.opened_at.isoformat() if p.opened_at else None,
            updated_at=p.updated_at.isoformat() if p.updated_at else None,
            completed_at=p.completed_at.isoformat() if p.completed_at else None,
        )
        for p, l in progress_rows
    ]

    fav_rows = (
        db.query(LessonFavourite, Lesson)
        .join(Lesson, Lesson.id == LessonFavourite.lesson_id)
        .filter(LessonFavourite.user_id == user_id)
        .order_by(LessonFavourite.created_at.desc())
        .all()
    )
    favourites = [
        StudentFavouriteRow(
            lesson_id=l.id,
            title_kk=l.title_kk,
            subject_code=l.subject_code,
            created_at=f.created_at.isoformat() if f.created_at else None,
        )
        for f, l in fav_rows
    ]

    return StudentDetail(
        user_id=user.id,
        telegram_id=user.telegram_id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        photo_url=user.photo_url,
        language_code=user.language_code,
        created_at=user.created_at.isoformat() if user.created_at else None,
        lessons_opened=len(progress),
        lessons_completed=sum(1 for p in progress if p.status == "completed"),
        progress=progress,
        favourites=favourites,
    )


class StudentProgressRow(BaseModel):
    user_id: int
    telegram_id: Optional[int]
    first_name: Optional[str]
    last_name: Optional[str]
    username: Optional[str]
    photo_url: Optional[str]
    status: str
    last_block_position: int
    seconds_spent: int
    opened_at: Optional[str]
    completed_at: Optional[str]


class LessonProgressOut(BaseModel):
    lesson_id: int
    title_kk: str
    total_blocks: int
    students: list[StudentProgressRow]


@router.get("/lessons/{lesson_id}/progress", response_model=LessonProgressOut)
def lesson_progress(
    lesson_id: int,
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    lesson = lesson_service.get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    total_blocks = (
        db.query(func.count(LessonBlock.id))
        .filter(LessonBlock.lesson_id == lesson_id)
        .scalar()
        or 0
    )

    rows = (
        db.query(LessonProgress, User)
        .join(User, User.id == LessonProgress.user_id)
        .filter(LessonProgress.lesson_id == lesson_id)
        .order_by(LessonProgress.updated_at.desc())
        .all()
    )

    students = [
        StudentProgressRow(
            user_id=u.id,
            telegram_id=u.telegram_id,
            first_name=u.first_name,
            last_name=u.last_name,
            username=u.username,
            photo_url=u.photo_url,
            status=p.status,
            last_block_position=p.last_block_position,
            seconds_spent=p.seconds_spent,
            opened_at=p.opened_at.isoformat() if p.opened_at else None,
            completed_at=p.completed_at.isoformat() if p.completed_at else None,
        )
        for p, u in rows
    ]

    return LessonProgressOut(
        lesson_id=lesson_id,
        title_kk=lesson.title_kk,
        total_blocks=total_blocks,
        students=students,
    )


@router.delete("/lessons/{lesson_id}")
def delete(
    lesson_id: int,
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    lesson = lesson_service.get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson_service.delete_lesson(db, lesson)
    return {"ok": True}


@router.post("/lessons/{lesson_id}/publish", response_model=LessonFull)
def publish(
    lesson_id: int,
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    lesson = lesson_service.get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson_service.set_published(db, lesson, True)


@router.post("/lessons/{lesson_id}/unpublish", response_model=LessonFull)
def unpublish(
    lesson_id: int,
    _: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    lesson = lesson_service.get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson_service.set_published(db, lesson, False)


# --- broadcast --------------------------------------------------------------


class BroadcastIn(BaseModel):
    text: str
    lesson_id: Optional[int] = None


async def _push_broadcast(text: str, lesson_id: Optional[int], student_ids: list[int]) -> int:
    bot_token = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token or not student_ids:
        return 0
    sent = 0
    mini_app_url = os.getenv("MINI_APP_URL")
    body = text
    if lesson_id and mini_app_url:
        body = f"{text}\n\n{mini_app_url}?startapp=lesson-{lesson_id}"
    async with httpx.AsyncClient(timeout=10) as client:
        for tg_id in student_ids:
            try:
                r = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": tg_id, "text": body},
                )
                if r.status_code == 200:
                    sent += 1
            except httpx.HTTPError:
                logger.exception("Broadcast failed for tg_id=%s", tg_id)
    return sent


@router.post("/broadcast")
async def broadcast(
    payload: BroadcastIn,
    background: BackgroundTasks,
    user: User = Depends(require_author),
    db: Session = Depends(get_db),
):
    students = db.query(User).filter(User.role == "student").all()
    student_ids = [s.telegram_id for s in students if s.telegram_id]

    log = BroadcastLog(
        author_id=user.id,
        lesson_id=payload.lesson_id,
        text=payload.text,
        sent_count=0,
    )
    db.add(log)
    db.commit()

    async def runner():
        sent = await _push_broadcast(payload.text, payload.lesson_id, student_ids)
        from app.database.database import SessionLocal

        with SessionLocal() as s:
            obj = s.query(BroadcastLog).filter(BroadcastLog.id == log.id).first()
            if obj:
                obj.sent_count = sent
                s.commit()

    background.add_task(runner)
    return {"queued": len(student_ids)}
