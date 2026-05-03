from __future__ import annotations

import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User
from app.schemas.user import TelegramUserIn, UserOut
from app.utils.auth import (
    get_current_user,
    is_author,
    parse_init_data,
)

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)


class RegisterIn(BaseModel):
    user: Optional[TelegramUserIn] = None


def _resolve_telegram_user(
    init_data_header: Optional[str], body_user: Optional[TelegramUserIn]
) -> TelegramUserIn:
    """Prefer initData (signed by Telegram), fall back to the body."""
    parsed = parse_init_data(init_data_header or "")
    tg_user = parsed.get("user")
    if isinstance(tg_user, dict) and tg_user.get("id"):
        return TelegramUserIn(**{
            "id": tg_user["id"],
            "first_name": tg_user.get("first_name"),
            "last_name": tg_user.get("last_name"),
            "username": tg_user.get("username"),
            "language_code": tg_user.get("language_code"),
            "photo_url": tg_user.get("photo_url"),
        })
    if body_user:
        return body_user
    raise HTTPException(
        status_code=401,
        detail="Telegram initData or user payload required",
    )


@router.post("/register", response_model=UserOut)
def register(
    payload: RegisterIn,
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
):
    tg = _resolve_telegram_user(x_telegram_init_data, payload.user)
    user = db.query(User).filter(User.telegram_id == tg.id).first()
    desired_role = "author" if is_author(tg.id) else "student"

    if user is None:
        user = User(
            telegram_id=tg.id,
            first_name=tg.first_name,
            last_name=tg.last_name,
            username=tg.username,
            language_code=tg.language_code,
            photo_url=tg.photo_url,
            role=desired_role,
        )
        db.add(user)
    else:
        user.first_name = tg.first_name or user.first_name
        user.last_name = tg.last_name or user.last_name
        user.username = tg.username or user.username
        user.language_code = tg.language_code or user.language_code
        user.photo_url = tg.photo_url or user.photo_url
        # Role can be promoted/demoted between visits as AUTHOR_TELEGRAM_IDS changes.
        user.role = desired_role

    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/{user_id}/avatar")
async def avatar(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.photo_url:
        return RedirectResponse(user.photo_url, status_code=302)

    bot_token = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=404, detail="No avatar available")

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getUserProfilePhotos",
                params={"user_id": user.telegram_id, "limit": 1},
            )
            data = r.json()
            if not data.get("ok") or not data["result"].get("photos"):
                raise HTTPException(status_code=404, detail="No avatar available")

            file_id = data["result"]["photos"][0][-1]["file_id"]
            r = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getFile",
                params={"file_id": file_id},
            )
            fdata = r.json()
            if not fdata.get("ok"):
                raise HTTPException(status_code=404, detail="No avatar available")

            file_path = fdata["result"]["file_path"]
            r = await client.get(
                f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
            )
            return Response(
                content=r.content,
                media_type=r.headers.get("content-type", "image/jpeg"),
            )
    except httpx.HTTPError:
        logger.exception("Telegram avatar proxy failed")
        raise HTTPException(status_code=502, detail="Telegram unreachable")
