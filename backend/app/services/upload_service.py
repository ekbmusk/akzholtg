from __future__ import annotations

import logging
import os
import re
import uuid
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_DEFAULT_UPLOAD_BASE = _BACKEND_DIR / "uploads"
UPLOAD_ROOT = (
    Path(os.getenv("UPLOAD_DIR", str(_DEFAULT_UPLOAD_BASE))) / "lesson-images"
)
LAB_IMAGE_SEED_DIR = _BACKEND_DIR / "seeds" / "lab-images"
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8MB — images only
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")


def _safe_filename(original: str) -> str:
    base = os.path.basename(original or "image")
    base = _SAFE_NAME.sub("_", base)
    if "." in base:
        stem, ext = base.rsplit(".", 1)
        return f"{stem[:40]}_{uuid.uuid4().hex[:8]}.{ext.lower()}"
    return f"{base[:40]}_{uuid.uuid4().hex[:8]}"


def _ensure_root() -> Path:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return UPLOAD_ROOT


def seed_bundled_images() -> int:
    """Copy lab cover PNGs shipped with the repo into UPLOAD_ROOT.

    Idempotent: skips files that already exist (e.g. on a persistent volume
    after the first deploy). Called once at startup so a fresh Railway
    volume gets populated without bundling images into git LFS or building
    them into a separate seeder image.
    """
    if not LAB_IMAGE_SEED_DIR.is_dir():
        return 0
    target = _ensure_root()
    copied = 0
    for src in LAB_IMAGE_SEED_DIR.glob("*.png"):
        dst = target / src.name
        if dst.exists():
            continue
        dst.write_bytes(src.read_bytes())
        copied += 1
    if copied:
        logger.info("Seeded %d lab cover images into %s", copied, target)
    return copied


async def save_images(files: Iterable[UploadFile]) -> list[str]:
    target_dir = _ensure_root()
    saved: list[str] = []
    for f in files:
        ext = os.path.splitext(f.filename or "")[1].lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(
                status_code=400, detail=f"Image type not allowed: {ext or '?'}"
            )
        contents = await f.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"Image too large: {f.filename}")
        name = _safe_filename(f.filename or "image")
        (target_dir / name).write_bytes(contents)
        saved.append(f"/api/uploads/lesson-images/{name}")
    return saved


def resolve_image(filename: str) -> Path:
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = UPLOAD_ROOT / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return path
