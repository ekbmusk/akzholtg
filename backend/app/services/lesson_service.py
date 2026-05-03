from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    Lesson,
    LessonBlock,
    LessonFavourite,
    LessonProgress,
    LessonVideo,
    Subject,
)
from app.schemas.lesson import LessonCreate, LessonUpdate


def list_lessons(
    db: Session,
    *,
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    include_unpublished: bool = False,
) -> list[Lesson]:
    q = db.query(Lesson)
    if not include_unpublished:
        q = q.filter(Lesson.is_published.is_(True))
    if subject:
        q = q.filter(Lesson.subject_code == subject)
    if difficulty:
        q = q.filter(Lesson.difficulty == difficulty)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(func.lower(Lesson.title_kk).like(like))
    rows = q.order_by(Lesson.is_featured.desc(), Lesson.created_at.desc()).all()
    if tag:
        rows = [l for l in rows if l.tags and tag in l.tags]
    return rows


def get_lesson(db: Session, lesson_id: int) -> Optional[Lesson]:
    return db.query(Lesson).filter(Lesson.id == lesson_id).first()


def list_subjects_with_counts(db: Session) -> list[dict]:
    subjects = db.query(Subject).order_by(Subject.position.asc()).all()
    counts = dict(
        db.query(Lesson.subject_code, func.count(Lesson.id))
        .filter(Lesson.is_published.is_(True))
        .group_by(Lesson.subject_code)
        .all()
    )
    out = []
    for s in subjects:
        out.append(
            {
                "code": s.code,
                "title_kk": s.title_kk,
                "icon": s.icon,
                "color": s.color,
                "position": s.position,
                "lesson_count": counts.get(s.code, 0),
            }
        )
    return out


# --- author CRUD ------------------------------------------------------------


def create_lesson(db: Session, payload: LessonCreate, author_id: int) -> Lesson:
    lesson = Lesson(
        title_kk=payload.title_kk,
        objective_kk=payload.objective_kk,
        summary_kk=payload.summary_kk,
        intro_kk=payload.intro_kk,
        overview_kk=payload.overview_kk,
        cover_image_url=payload.cover_image_url,
        subject_code=payload.subject_code,
        difficulty=payload.difficulty,
        age_range=payload.age_range,
        tags=payload.tags,
        references=[r.model_dump() for r in payload.references],
        estimated_minutes=payload.estimated_minutes,
        is_featured=payload.is_featured,
        is_published=False,
        author_id=author_id,
    )
    db.add(lesson)
    db.flush()
    for i, b in enumerate(payload.blocks):
        db.add(
            LessonBlock(
                lesson_id=lesson.id,
                position=b.position or i,
                type=b.type,
                payload=b.payload,
            )
        )
    for i, v in enumerate(payload.videos):
        db.add(
            LessonVideo(
                lesson_id=lesson.id,
                position=v.position or i,
                provider=v.provider,
                external_id_or_url=v.external_id_or_url,
                title_kk=v.title_kk,
                duration_sec=v.duration_sec,
            )
        )
    db.commit()
    db.refresh(lesson)
    return lesson


def update_lesson(db: Session, lesson: Lesson, payload: LessonUpdate) -> Lesson:
    data = payload.model_dump(exclude_unset=True)
    for field in (
        "title_kk", "objective_kk", "summary_kk", "intro_kk", "overview_kk",
        "cover_image_url", "subject_code", "difficulty", "age_range", "tags",
        "estimated_minutes", "is_featured",
    ):
        if field in data:
            setattr(lesson, field, data[field])
    if "references" in data and data["references"] is not None:
        lesson.references = [r.model_dump() if hasattr(r, "model_dump") else r for r in data["references"]]

    if data.get("blocks") is not None:
        db.query(LessonBlock).filter(LessonBlock.lesson_id == lesson.id).delete()
        for i, b in enumerate(payload.blocks or []):
            db.add(
                LessonBlock(
                    lesson_id=lesson.id,
                    position=b.position or i,
                    type=b.type,
                    payload=b.payload,
                )
            )
    if data.get("videos") is not None:
        db.query(LessonVideo).filter(LessonVideo.lesson_id == lesson.id).delete()
        for i, v in enumerate(payload.videos or []):
            db.add(
                LessonVideo(
                    lesson_id=lesson.id,
                    position=v.position or i,
                    provider=v.provider,
                    external_id_or_url=v.external_id_or_url,
                    title_kk=v.title_kk,
                    duration_sec=v.duration_sec,
                )
            )
    db.commit()
    db.refresh(lesson)
    return lesson


def delete_lesson(db: Session, lesson: Lesson) -> None:
    db.delete(lesson)
    db.commit()


def set_published(db: Session, lesson: Lesson, published: bool) -> Lesson:
    lesson.is_published = published
    if published and lesson.published_at is None:
        lesson.published_at = datetime.utcnow()
    db.commit()
    db.refresh(lesson)
    return lesson


# --- progress + favourites --------------------------------------------------


def open_lesson(db: Session, user_id: int, lesson_id: int) -> LessonProgress:
    p = (
        db.query(LessonProgress)
        .filter_by(user_id=user_id, lesson_id=lesson_id)
        .first()
    )
    if p is None:
        p = LessonProgress(user_id=user_id, lesson_id=lesson_id, status="opened")
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def update_progress(
    db: Session,
    user_id: int,
    lesson_id: int,
    *,
    last_block_position: Optional[int],
    seconds_spent: Optional[int],
) -> LessonProgress:
    p = open_lesson(db, user_id, lesson_id)
    if last_block_position is not None and last_block_position > p.last_block_position:
        p.last_block_position = last_block_position
        if p.status == "opened":
            p.status = "in_progress"
    if seconds_spent is not None:
        # Cap by 4× estimated_minutes to avoid gaming.
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        cap = (lesson.estimated_minutes or 60) * 60 * 4 if lesson else seconds_spent
        p.seconds_spent = min(max(p.seconds_spent, seconds_spent), cap)
    db.commit()
    db.refresh(p)
    return p


def complete_lesson(db: Session, user_id: int, lesson_id: int) -> LessonProgress:
    p = open_lesson(db, user_id, lesson_id)
    p.status = "completed"
    p.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return p


def list_my_progress(db: Session, user_id: int) -> list[LessonProgress]:
    return (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user_id)
        .order_by(LessonProgress.updated_at.desc())
        .all()
    )


def add_favourite(db: Session, user_id: int, lesson_id: int) -> LessonFavourite:
    fav = (
        db.query(LessonFavourite)
        .filter_by(user_id=user_id, lesson_id=lesson_id)
        .first()
    )
    if fav:
        return fav
    fav = LessonFavourite(user_id=user_id, lesson_id=lesson_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


def remove_favourite(db: Session, user_id: int, lesson_id: int) -> None:
    db.query(LessonFavourite).filter_by(
        user_id=user_id, lesson_id=lesson_id
    ).delete()
    db.commit()


def list_favourites(db: Session, user_id: int) -> list[LessonFavourite]:
    return (
        db.query(LessonFavourite)
        .filter(LessonFavourite.user_id == user_id)
        .order_by(LessonFavourite.created_at.desc())
        .all()
    )
