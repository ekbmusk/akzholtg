from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.lesson import FavouriteOut
from app.services import lesson_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/favourites", tags=["favourites"])


@router.get("/", response_model=list[FavouriteOut])
def list_(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.list_favourites(db, user.id)


@router.post("/{lesson_id}", response_model=FavouriteOut)
def add(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return lesson_service.add_favourite(db, user.id, lesson_id)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson_service.remove_favourite(db, user.id, lesson_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
