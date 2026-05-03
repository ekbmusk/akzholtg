from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse

from app.database.models import User
from app.services import upload_service
from app.utils.auth import require_author

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/lesson-images")
async def upload_lesson_images(
    files: list[UploadFile] = File(...),
    _: User = Depends(require_author),
):
    urls = await upload_service.save_images(files)
    return {"files": urls}


@router.get("/lesson-images/{filename}")
def get_lesson_image(filename: str):
    path = upload_service.resolve_image(filename)
    return FileResponse(path)
