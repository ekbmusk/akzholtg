from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_DIGEST, mini_app_button

router = Router(name="digest")


@router.message(or_f(Command("digest"), F.text == BTN_DIGEST))
async def on_digest(message: Message) -> None:
    rows = await client().list_featured(limit=5)
    if not rows:
        await message.answer(
            "Әзірге таңдамалы сабақтар жоқ. Кітапханаға кіріп, жаңалықтарды қара.",
            reply_markup=mini_app_button(),
        )
        return

    lines = ["*Аптаның таңдамалы сабақтары*\n"]
    for r in rows:
        mins = f" · {r['estimated_minutes']} мин" if r.get("estimated_minutes") else ""
        lines.append(f"• {r['title_kk']}{mins}")

    await message.answer(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=mini_app_button("Кітапханаға кіру"),
    )
