"""Internal endpoints used by the bot process. Auth: X-Bot-Token shared secret."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import (
    Lesson,
    LessonFavourite,
    LessonProgress,
    Notification,
    User,
)
from app.schemas.bot import BotLessonItem, BotNotification, BotUserOut
from app.utils.auth import require_bot_token

router = APIRouter(
    prefix="/api/bot",
    tags=["bot"],
    dependencies=[Depends(require_bot_token)],
)


@router.get("/users/by-telegram/{telegram_id}", response_model=BotUserOut)
def get_user_by_telegram(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{user_id}/progress", response_model=list[BotLessonItem])
def get_user_progress(user_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(LessonProgress, Lesson)
        .join(Lesson, Lesson.id == LessonProgress.lesson_id)
        .filter(LessonProgress.user_id == user_id)
        .order_by(LessonProgress.updated_at.desc())
        .all()
    )
    fav_ids = {
        f.lesson_id
        for f in db.query(LessonFavourite)
        .filter(LessonFavourite.user_id == user_id)
        .all()
    }
    return [
        BotLessonItem(
            lesson_id=l.id,
            title_kk=l.title_kk,
            subject_code=l.subject_code,
            difficulty=l.difficulty,
            estimated_minutes=l.estimated_minutes,
            status=p.status,
            is_favourite=l.id in fav_ids,
        )
        for p, l in rows
    ]


@router.get("/users/{user_id}/favourites", response_model=list[BotLessonItem])
def get_user_favourites(user_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(LessonFavourite, Lesson)
        .join(Lesson, Lesson.id == LessonFavourite.lesson_id)
        .filter(LessonFavourite.user_id == user_id)
        .order_by(LessonFavourite.created_at.desc())
        .all()
    )
    return [
        BotLessonItem(
            lesson_id=l.id,
            title_kk=l.title_kk,
            subject_code=l.subject_code,
            difficulty=l.difficulty,
            estimated_minutes=l.estimated_minutes,
            is_favourite=True,
        )
        for _, l in rows
    ]


@router.get("/lessons/featured", response_model=list[BotLessonItem])
def featured(limit: int = Query(5, ge=1, le=20), db: Session = Depends(get_db)):
    rows = (
        db.query(Lesson)
        .filter(Lesson.is_published.is_(True), Lesson.is_featured.is_(True))
        .order_by(Lesson.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        BotLessonItem(
            lesson_id=l.id,
            title_kk=l.title_kk,
            subject_code=l.subject_code,
            difficulty=l.difficulty,
            estimated_minutes=l.estimated_minutes,
        )
        for l in rows
    ]


@router.get("/notifications/pending", response_model=list[BotNotification])
def pending_notifications(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Notification, User.telegram_id)
        .join(User, User.id == Notification.user_id)
        .filter(Notification.delivered.is_(False))
        .order_by(Notification.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        BotNotification(
            id=n.id,
            user_id=n.user_id,
            telegram_id=tg_id,
            type=n.type,
            payload=n.payload,
            created_at=n.created_at,
        )
        for n, tg_id in rows
    ]


@router.post("/notifications/{notification_id}/delivered")
def mark_delivered(notification_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.delivered = True
    db.commit()
    return {"ok": True, "id": n.id}
