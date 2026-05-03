from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class BotUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    role: str


class BotLessonItem(BaseModel):
    lesson_id: int
    title_kk: str
    subject_code: str
    difficulty: str
    estimated_minutes: Optional[int] = None
    status: Optional[str] = None  # progress status: opened|in_progress|completed
    is_favourite: bool = False


class BotNotification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    telegram_id: int
    type: str
    payload: Optional[dict[str, Any]] = None
    created_at: datetime
