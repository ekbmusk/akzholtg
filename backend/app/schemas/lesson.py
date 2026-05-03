from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


BlockType = Literal[
    "text", "formula", "image", "video", "fact", "quote", "divider"
]
Difficulty = Literal["easy", "medium", "hard"]
VideoProvider = Literal["youtube", "mp4"]


class LessonBlockIn(BaseModel):
    position: int = 0
    type: BlockType
    payload: dict[str, Any] = Field(default_factory=dict)


class LessonBlockOut(LessonBlockIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class LessonVideoIn(BaseModel):
    provider: VideoProvider = "youtube"
    external_id_or_url: str
    title_kk: Optional[str] = None
    duration_sec: Optional[int] = None
    position: int = 0


class LessonVideoOut(LessonVideoIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class LessonReferenceItem(BaseModel):
    title: str
    url: str


class LessonSummary(BaseModel):
    """Light projection used by the catalogue grid."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title_kk: str
    summary_kk: Optional[str] = None
    cover_image_url: Optional[str] = None
    subject_code: str
    difficulty: Difficulty
    age_range: Optional[str] = None
    tags: Optional[list[str]] = None
    estimated_minutes: Optional[int] = None
    is_featured: bool = False
    published_at: Optional[datetime] = None


class LessonFull(LessonSummary):
    objective_kk: Optional[str] = None
    intro_kk: Optional[str] = None
    overview_kk: Optional[str] = None
    references: Optional[list[LessonReferenceItem]] = None
    blocks: list[LessonBlockOut] = Field(default_factory=list)
    videos: list[LessonVideoOut] = Field(default_factory=list)
    is_published: bool = True
    created_at: datetime
    updated_at: datetime


class LessonCreate(BaseModel):
    title_kk: str
    objective_kk: Optional[str] = None
    summary_kk: Optional[str] = None
    intro_kk: Optional[str] = None
    overview_kk: Optional[str] = None
    cover_image_url: Optional[str] = None
    subject_code: str
    difficulty: Difficulty = "medium"
    age_range: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    references: list[LessonReferenceItem] = Field(default_factory=list)
    estimated_minutes: Optional[int] = None
    is_featured: bool = False
    blocks: list[LessonBlockIn] = Field(default_factory=list)
    videos: list[LessonVideoIn] = Field(default_factory=list)


class LessonUpdate(BaseModel):
    title_kk: Optional[str] = None
    objective_kk: Optional[str] = None
    summary_kk: Optional[str] = None
    intro_kk: Optional[str] = None
    overview_kk: Optional[str] = None
    cover_image_url: Optional[str] = None
    subject_code: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    age_range: Optional[str] = None
    tags: Optional[list[str]] = None
    references: Optional[list[LessonReferenceItem]] = None
    estimated_minutes: Optional[int] = None
    is_featured: Optional[bool] = None
    blocks: Optional[list[LessonBlockIn]] = None
    videos: Optional[list[LessonVideoIn]] = None


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    title_kk: str
    icon: Optional[str] = None
    color: Optional[str] = None
    position: int = 0
    lesson_count: int = 0


class ProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    lesson_id: int
    status: Literal["opened", "in_progress", "completed"]
    last_block_position: int = 0
    seconds_spent: int = 0
    opened_at: datetime
    completed_at: Optional[datetime] = None


class ProgressUpdate(BaseModel):
    last_block_position: Optional[int] = None
    seconds_spent: Optional[int] = None


class FavouriteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    lesson_id: int
    created_at: datetime
