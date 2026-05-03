from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_HISTORY, mini_app_button

router = Router(name="history")

STATUS_LABEL = {
    "completed": "оқылды",
    "in_progress": "жалғасуда",
    "opened": "ашылды",
}


@router.message(or_f(Command("history"), F.text == BTN_HISTORY))
async def on_history(message: Message) -> None:
    user = message.from_user
    if not user:
        return
    backend_user = await client().get_user_by_telegram(user.id)
    if not backend_user:
        await message.answer(
            "Алдымен Mini App-қа кір, сосын тарих көрінеді.",
            reply_markup=mini_app_button(),
        )
        return

    rows = await client().list_progress(backend_user["id"])
    if not rows:
        await message.answer(
            "Әлі бірде-бір сабақ ашылмаған. Кітапханадан бастап көр.",
            reply_markup=mini_app_button(),
        )
        return

    lines = ["*Оқу тарихы*\n"]
    for r in rows[:15]:
        status = STATUS_LABEL.get(r["status"], r["status"])
        lines.append(f"• {r['title_kk']} — _{status}_")
    if len(rows) > 15:
        lines.append(f"\n…тағы {len(rows) - 15} сабақ Mini App-та")

    await message.answer(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=mini_app_button("Толық тарих"),
    )
