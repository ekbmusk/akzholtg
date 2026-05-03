from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.lesson import ProgressOut, ProgressUpdate
from app.services import lesson_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.post("/{lesson_id}/open", response_model=ProgressOut)
def open_(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.open_lesson(db, user.id, lesson_id)


@router.patch("/{lesson_id}", response_model=ProgressOut)
def patch(
    lesson_id: int,
    payload: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.update_progress(
        db,
        user.id,
        lesson_id,
        last_block_position=payload.last_block_position,
        seconds_spent=payload.seconds_spent,
    )


@router.post("/{lesson_id}/complete", response_model=ProgressOut)
def complete(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.complete_lesson(db, user.id, lesson_id)


@router.get("/mine", response_model=list[ProgressOut])
def mine(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.list_my_progress(db, user.id)
