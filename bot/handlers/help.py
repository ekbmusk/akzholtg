from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, or_f
from aiogram.types import Message

from keyboards import BTN_HELP

router = Router(name="help")

HELP_TEXT = (
    "*Көмек*\n\n"
    "Бұл қолданба зертханалық жобаларды сабаққа дейін көріп, дайындалу үшін. "
    "Жобаны Mini App арқылы ашасың, ұнағанын таңдаулыға қосып қоясың.\n\n"
    "*Командалар*\n"
    "/start — бастапқы экран\n"
    "/library — жобалар кітапханасы\n"
    "/history — қаралған жобалар\n"
    "/favourites — таңдаулы жобалар\n"
    "/digest — апталық таңдамалар\n"
    "/help — осы анықтама\n\n"
    "Төмендегі түймелермен де бірден өте аласың."
)


@router.message(or_f(Command("help"), F.text == BTN_HELP))
async def on_help(message: Message) -> None:
    await message.answer(HELP_TEXT, parse_mode="Markdown")
