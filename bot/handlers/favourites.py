from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from api import client
from keyboards import BTN_FAVOURITES, mini_app_button

router = Router(name="favourites")


@router.message(or_f(Command("favourites"), F.text == BTN_FAVOURITES))
async def on_favourites(message: Message) -> None:
    user = message.from_user
    if not user:
        return
    backend_user = await client().get_user_by_telegram(user.id)
    if not backend_user:
        await message.answer(
            "Алдымен Mini App-қа кір, сосын таңдаулы көрінеді.",
            reply_markup=mini_app_button(),
        )
        return

    rows = await client().list_favourites(backend_user["id"])
    if not rows:
        await message.answer(
            "Таңдаулы сабақ жоқ. Кітапханадан жүректі бас.",
            reply_markup=mini_app_button(),
        )
        return

    lines = ["*Таңдаулы сабақтар*\n"]
    for r in rows[:15]:
        lines.append(f"• {r['title_kk']}")
    if len(rows) > 15:
        lines.append(f"\n…тағы {len(rows) - 15} сабақ")

    await message.answer(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=mini_app_button("Таңдаулыны ашу"),
    )
