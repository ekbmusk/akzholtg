from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.lesson import LessonFull, LessonSummary, SubjectOut
from app.services import lesson_service

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("/", response_model=list[LessonSummary])
def list_lessons(
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
):
    return lesson_service.list_lessons(
        db,
        subject=subject,
        difficulty=difficulty,
        tag=tag,
        search=search,
    )


@router.get("/featured", response_model=list[LessonSummary])
def featured(db: Session = Depends(get_db)):
    rows = lesson_service.list_lessons(db)
    return [r for r in rows if r.is_featured]


@router.get("/subjects", response_model=list[SubjectOut])
def subjects(db: Session = Depends(get_db)):
    return lesson_service.list_subjects_with_counts(db)


@router.get("/{lesson_id}", response_model=LessonFull)
def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    lesson = lesson_service.get_lesson(db, lesson_id)
    if not lesson or not lesson.is_published:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson
