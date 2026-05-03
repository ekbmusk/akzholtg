from __future__ import annotations

import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties

import api
import notifier
from config import BOT_TOKEN, assert_runtime_config
from handlers import all_routers


_RAW_LEVEL = (os.getenv("LOG_LEVEL") or "INFO").upper()
_LEVEL = getattr(logging, _RAW_LEVEL, None)
if not isinstance(_LEVEL, int):
    # Hosting providers occasionally inject non-standard values (e.g. "1");
    # fall back rather than crashing the worker on startup.
    _LEVEL = logging.INFO
logging.basicConfig(
    level=_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    assert_runtime_config()

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=None),
    )
    dispatcher = Dispatcher()
    for router in all_routers():
        dispatcher.include_router(router)

    stop_event = asyncio.Event()
    notifier_task = asyncio.create_task(notifier.run(bot, stop_event))

    try:
        logger.info("Starting bot polling")
        await dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types())
    finally:
        stop_event.set()
        await notifier_task
        await api.shutdown()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
