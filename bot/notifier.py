"""Periodic dispatch loop: pull pending notifications from the backend and
deliver them via Telegram.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError

from api import client
from config import NOTIFIER_INTERVAL_SEC
from keyboards import mini_app_button, open_specific_lesson

logger = logging.getLogger(__name__)


def _format(notification: dict) -> tuple[str, Optional[int]]:
    """Return (text, optional_lesson_id) for a notification."""
    n_type = notification.get("type")
    payload = notification.get("payload") or {}

    if n_type == "broadcast":
        return payload.get("text") or "", payload.get("lesson_id")

    if n_type == "new_lesson":
        title = payload.get("title_kk") or "жаңа сабақ"
        return (
            f"*Жаңа сабақ*\n\n«{title}» кітапханаға қосылды.",
            payload.get("lesson_id"),
        )

    if n_type == "lesson_reminder":
        title = payload.get("title_kk") or f"Сабақ №{payload.get('lesson_id', '?')}"
        return (
            f"Еске салу: «{title}» сабағын аяқтаудан қалмай көр.",
            payload.get("lesson_id"),
        )

    return payload.get("text") or n_type or "Жаңа хабар", payload.get("lesson_id")


async def deliver_one(bot: Bot, notification: dict) -> bool:
    text, lesson_id = _format(notification)
    if not text:
        await client().ack_notification(notification["id"])
        return True

    keyboard = (
        open_specific_lesson(lesson_id) if lesson_id else mini_app_button()
    )

    try:
        await bot.send_message(
            chat_id=notification["telegram_id"],
            text=text,
            parse_mode="Markdown",
            reply_markup=keyboard,
        )
    except TelegramAPIError as exc:
        message = str(exc).lower()
        if any(k in message for k in ("blocked", "chat not found", "user is deactivated")):
            logger.info("Dropping notification %s: %s", notification["id"], exc)
            await client().ack_notification(notification["id"])
            return True
        logger.warning("Telegram delivery failed for %s: %s", notification["id"], exc)
        return False

    await client().ack_notification(notification["id"])
    return True


async def run(bot: Bot, stop_event: asyncio.Event) -> None:
    logger.info("Notifier started (interval %ss)", NOTIFIER_INTERVAL_SEC)
    while not stop_event.is_set():
        try:
            pending = await client().pending_notifications()
            for n in pending:
                if stop_event.is_set():
                    break
                await deliver_one(bot, n)
        except Exception:  # noqa: BLE001
            logger.exception("Notifier tick failed")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=NOTIFIER_INTERVAL_SEC)
        except asyncio.TimeoutError:
            pass
    logger.info("Notifier stopped")
