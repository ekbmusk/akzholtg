"""Keyboard factories for the theory bot."""
from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from config import MINI_APP_URL

BTN_OPEN_APP = "Кітапхананы ашу"
BTN_HISTORY = "Оқу тарихы"
BTN_FAVOURITES = "Таңдаулы"
BTN_DIGEST = "Аптаның сабақтары"
BTN_HELP = "Көмек"


def main_reply_keyboard(role: str | None = None) -> ReplyKeyboardMarkup:
    rows: list[list[KeyboardButton]] = [
        [KeyboardButton(text=BTN_OPEN_APP, web_app=WebAppInfo(url=MINI_APP_URL))],
        [
            KeyboardButton(text=BTN_HISTORY),
            KeyboardButton(text=BTN_FAVOURITES),
        ],
        [
            KeyboardButton(text=BTN_DIGEST),
            KeyboardButton(text=BTN_HELP),
        ],
    ]
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        is_persistent=True,
    )


def mini_app_button(text: str = "Кітапхананы ашу") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=text, web_app=WebAppInfo(url=MINI_APP_URL))],
        ]
    )


def open_specific_lesson(
    lesson_id: int, label: str = "Сабақты ашу"
) -> InlineKeyboardMarkup:
    """Deep-link button — opens the Mini App with the lesson preselected via
    Telegram.WebApp.initDataUnsafe.start_param."""
    url = f"{MINI_APP_URL}?startapp=lesson-{lesson_id}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=label, web_app=WebAppInfo(url=url))]
        ]
    )
