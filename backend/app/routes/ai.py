from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.database.models import Lesson, LessonBlock, User
from app.schemas.ai import AskOut, ExplainIn, SummariseIn
from app.services import ai_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/explain", response_model=AskOut)
async def explain(
    payload: ExplainIn,
    _user: User = Depends(get_current_user),
):
    answer, blocked, reason = await ai_service.ask(payload.prompt, payload.context)
    return AskOut(answer=answer, blocked=blocked, reason=reason)


@router.post("/summarise", response_model=AskOut)
async def summarise(
    payload: SummariseIn,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == payload.lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    blocks = (
        db.query(LessonBlock)
        .filter(LessonBlock.lesson_id == lesson.id)
        .order_by(LessonBlock.position)
        .all()
    )
    body_parts: list[str] = []
    for b in blocks:
        if b.type == "text":
            body_parts.append(b.payload.get("text_kk", ""))
        elif b.type == "fact":
            body_parts.append("💡 " + b.payload.get("text_kk", ""))
        elif b.type == "quote":
            body_parts.append('"' + b.payload.get("text_kk", "") + '"')
        elif b.type == "formula":
            cap = b.payload.get("caption_kk", "")
            if cap:
                body_parts.append(f"[Формула: {cap}]")

    body = "\n\n".join(p for p in body_parts if p)
    prompt = (
        f"Сабақ тақырыбы: {lesson.title_kk}\n\n"
        f"Сабақ мазмұны:\n{body[:3500]}\n\n"
        "Сабақтың 3-4 негізгі ойын қазақ тілінде, қысқа маркерленген тізіммен жаз."
    )
    answer, blocked, reason = await ai_service.ask(prompt)
    return AskOut(answer=answer, blocked=blocked, reason=reason)
