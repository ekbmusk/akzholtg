"""Telegram-initData based auth.

Per CLAUDE.md, the backend trusts the X-Telegram-Init-Data header without
verifying its HMAC signature. The author role is decided server-side by
matching the Telegram user ID against AUTHOR_TELEGRAM_IDS.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import User

logger = logging.getLogger(__name__)


def parse_init_data(init_data: str) -> dict:
    if not init_data:
        return {}
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    user_raw = parsed.get("user")
    if user_raw:
        try:
            parsed["user"] = json.loads(user_raw)
        except json.JSONDecodeError:
            logger.warning("Failed to parse Telegram initData user field")
            parsed["user"] = None
    return parsed


def get_author_ids() -> set[int]:
    raw = os.getenv("AUTHOR_TELEGRAM_IDS", "") or os.getenv("TEACHER_TELEGRAM_IDS", "")
    out: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            out.add(int(part))
        except ValueError:
            logger.warning("Invalid author Telegram ID: %s", part)
    return out


def is_author(telegram_id: int) -> bool:
    return telegram_id in get_author_ids()


def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    db: Session = Depends(get_db),
) -> User:
    parsed = parse_init_data(x_telegram_init_data or "")
    tg_user = parsed.get("user") or {}
    tg_id = tg_user.get("id") if isinstance(tg_user, dict) else None
    if not tg_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram initData is required",
        )
    user = db.query(User).filter(User.telegram_id == int(tg_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not registered",
        )
    return user


def require_author(user: User = Depends(get_current_user)) -> User:
    if user.role != "author":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Author access required",
        )
    return user


def require_bot_token(
    x_bot_token: Optional[str] = Header(None, alias="X-Bot-Token"),
) -> None:
    expected = os.getenv("INTERNAL_BOT_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bot integration is not configured",
        )
    if not x_bot_token or x_bot_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bot token",
        )
