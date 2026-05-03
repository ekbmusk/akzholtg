from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from api import client
from keyboards import main_reply_keyboard

router = Router(name="start")


STUDENT_TEXT = (
    "Сәлем, {name}!\n\n"
    "Бұл — зертханалық жобалармен сабаққа дайындалуға арналған қолданба.\n\n"
    "— Сабаққа дейін жобамен таныс — не істейміз, не керек, қандай қадамдар\n"
    "— Әр жоба қадаммен ашылады: мақсат, гипотеза, жабдықтар, эксперимент\n"
    "— Ұнаған жобаларды таңдаулыға қос — сабақ үстінде оңай қайтып келесің\n\n"
    "Төмендегі түймемен бастаймыз."
)

AUTHOR_TEXT = (
    "Сәлем, {name}!\n\n"
    "Сен — жоба авторысың. Mini App арқылы:\n\n"
    "— Жаңа жоба жаз (мәтін, формула, видео, факт, дәйексөз блоктары)\n"
    "— Кітапханадағы жобаларды реттеп, жариялау\n"
    "— Оқушылардың прогресі мен таңдаулы статистикасын қара\n"
    "— Оқушыларға хабар жібер\n\n"
    "Бастаймыз."
)


@router.message(CommandStart())
async def on_start(message: Message) -> None:
    user = message.from_user
    if not user:
        return

    backend_user = await client().get_user_by_telegram(user.id)
    role = backend_user["role"] if backend_user else None

    template = AUTHOR_TEXT if role == "author" else STUDENT_TEXT
    text = template.format(
        name=user.first_name or ("автор" if role == "author" else "оқушы"),
    )

    await message.answer(text, reply_markup=main_reply_keyboard(role))
