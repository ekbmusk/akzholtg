from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from keyboards import BTN_HELP

router = Router(name="help")

HELP_TEXT = (
    "*Көмек*\n\n"
    "STEM Theory Bot — қазақша қысқа теориялық сабақтардың кітапханасы. "
    "Сабақтарды Mini App арқылы оқисың, ұнағанын таңдаулыға қосып қоясың.\n\n"
    "*Командалар*\n"
    "/start — бастапқы экран\n"
    "/library — кітапхананы ашу\n"
    "/history — оқу тарихы\n"
    "/favourites — таңдаулы сабақтар\n"
    "/digest — апталық таңдамалар\n"
    "/help — осы анықтама\n\n"
    "Төмендегі түймелермен де бірден өте аласың."
)


@router.message(or_f(Command("help"), F.text == BTN_HELP))
async def on_help(message: Message) -> None:
    await message.answer(HELP_TEXT, parse_mode="Markdown")
