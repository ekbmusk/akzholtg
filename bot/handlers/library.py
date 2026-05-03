from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from keyboards import BTN_OPEN_APP, mini_app_button

router = Router(name="library")


@router.message(or_f(Command("library"), F.text == BTN_OPEN_APP))
async def on_library(message: Message) -> None:
    await message.answer(
        "Кітапхананы ашамыз — зертханалық жобаны тап, сабақ алдында таныс.",
        reply_markup=mini_app_button("Кітапхананы ашу"),
    )
