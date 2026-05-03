"""Centralised env-driven config for the bot process."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


# Telegram — accept either name; BOT_TOKEN takes precedence.
BOT_TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN") or ""

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8001").rstrip("/")
INTERNAL_BOT_TOKEN = os.getenv("INTERNAL_BOT_TOKEN", "")
MINI_APP_URL = os.getenv("MINI_APP_URL", "")

NOTIFIER_INTERVAL_SEC = int(os.getenv("NOTIFIER_INTERVAL_SEC", "30"))
HTTP_TIMEOUT_SEC = float(os.getenv("BOT_HTTP_TIMEOUT_SEC", "10"))


def assert_runtime_config() -> None:
    """Fail fast at startup if anything critical is missing."""
    if not BOT_TOKEN:
        raise RuntimeError("BOT_TOKEN (or TELEGRAM_BOT_TOKEN) is required")
    if not INTERNAL_BOT_TOKEN:
        raise RuntimeError("INTERNAL_BOT_TOKEN is required for backend communication")
    if not MINI_APP_URL:
        raise RuntimeError("MINI_APP_URL is required to render the Mini App button")
