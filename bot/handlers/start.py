from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from api import client
from keyboards import main_reply_keyboard

router = Router(name="start")


STUDENT_TEXT = (
    "Сәлем, {name}!\n\n"
    "STEM Theory Bot — қазақша қысқа теориялық сабақтардың кітапханасы.\n\n"
    "— Кітапхананы ашып, өзіңе ұнайтын тақырыпты тап\n"
    "— Сабақты оқып, видео көріп, формула мен фактілермен танысып шық\n"
    "— Ұнаған сабақтарды таңдаулыға қос — кейін оңай қайтып келесің\n\n"
    "Төмендегі түймемен бастаймыз."
)

AUTHOR_TEXT = (
    "Сәлем, {name}!\n\n"
    "Сен — STEM Theory Bot авторысың. Mini App арқылы:\n\n"
    "— Жаңа сабақ жаз (мәтін, формула, видео, факт, дәйексөз блоктары)\n"
    "— Кітапханадағы сабақтарды реттеп, жариялау\n"
    "— Қаралымдар мен таңдаулы статистикасын қара\n"
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
