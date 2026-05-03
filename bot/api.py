"""Thin httpx wrapper around the backend's /api/bot/* endpoints.

Per CLAUDE.md, every backend call uses a short timeout and degrades silently
on failure — handlers should always return *something* to the user, even when
the backend is down.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from config import BACKEND_URL, HTTP_TIMEOUT_SEC, INTERNAL_BOT_TOKEN

logger = logging.getLogger(__name__)


class BackendClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=BACKEND_URL,
            timeout=HTTP_TIMEOUT_SEC,
            headers={"X-Bot-Token": INTERNAL_BOT_TOKEN},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, **params: Any) -> Optional[Any]:
        try:
            r = await self._client.get(path, params=params or None)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError:
            logger.warning("Backend GET %s failed", path, exc_info=True)
            return None

    async def _post(self, path: str, **json_body: Any) -> Optional[Any]:
        try:
            r = await self._client.post(path, json=json_body or None)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError:
            logger.warning("Backend POST %s failed", path, exc_info=True)
            return None

    # ---- domain methods --------------------------------------------------

    async def get_user_by_telegram(self, tg_id: int) -> Optional[dict]:
        return await self._get(f"/api/bot/users/by-telegram/{tg_id}")

    async def list_progress(self, user_id: int) -> list[dict]:
        return await self._get(f"/api/bot/users/{user_id}/progress") or []

    async def list_favourites(self, user_id: int) -> list[dict]:
        return await self._get(f"/api/bot/users/{user_id}/favourites") or []

    async def list_featured(self, limit: int = 5) -> list[dict]:
        return await self._get("/api/bot/lessons/featured", limit=limit) or []

    async def pending_notifications(self, limit: int = 50) -> list[dict]:
        return await self._get("/api/bot/notifications/pending", limit=limit) or []

    async def ack_notification(self, notification_id: int) -> bool:
        return bool(await self._post(f"/api/bot/notifications/{notification_id}/delivered"))


# Module-level singleton — bot is single-process, so a shared client is fine.
_client: Optional[BackendClient] = None


def client() -> BackendClient:
    global _client
    if _client is None:
        _client = BackendClient()
    return _client


async def shutdown() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
