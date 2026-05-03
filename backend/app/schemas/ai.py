from typing import Optional

from pydantic import BaseModel, Field


class ExplainIn(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    context: Optional[str] = Field(None, max_length=4000)


class SummariseIn(BaseModel):
    lesson_id: int


class AskOut(BaseModel):
    answer: str
    blocked: bool = False
    reason: Optional[str] = None
