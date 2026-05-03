from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    language_code = Column(String(10), nullable=True)
    photo_url = Column(String(1000), nullable=True)
    role = Column(String(20), default="student", nullable=False)  # student | author
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    progress = relationship(
        "LessonProgress", back_populates="user", cascade="all, delete-orphan"
    )
    favourites = relationship(
        "LessonFavourite", back_populates="user", cascade="all, delete-orphan"
    )


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    title_kk = Column(String(255), nullable=False)
    icon = Column(String(20), nullable=True)
    color = Column(String(20), nullable=True)
    position = Column(Integer, default=0, nullable=False)


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True)
    title_kk = Column(String(500), nullable=False)
    objective_kk = Column(Text, nullable=True)
    summary_kk = Column(Text, nullable=True)
    intro_kk = Column(Text, nullable=True)
    # Human-readable "what you'll do this lesson" preview shown on the
    # student-facing landing screen before the wizard starts.
    overview_kk = Column(Text, nullable=True)
    cover_image_url = Column(String(1000), nullable=True)
    subject_code = Column(String(50), nullable=False, index=True)
    difficulty = Column(String(20), nullable=False, default="medium")
    age_range = Column(String(20), nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    references = Column(JSON, nullable=True, default=list)  # [{title, url}]
    estimated_minutes = Column(Integer, nullable=True)
    is_published = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    published_at = Column(DateTime, nullable=True)
    author_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    blocks = relationship(
        "LessonBlock",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonBlock.position",
    )
    videos = relationship(
        "LessonVideo",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="LessonVideo.position",
    )
    progress = relationship(
        "LessonProgress", back_populates="lesson", cascade="all, delete-orphan"
    )
    favourites = relationship(
        "LessonFavourite", back_populates="lesson", cascade="all, delete-orphan"
    )


class LessonBlock(Base):
    __tablename__ = "lesson_blocks"

    id = Column(Integer, primary_key=True)
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, default=0, nullable=False)
    # text | formula | image | video | fact | quote | divider
    type = Column(String(20), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lesson = relationship("Lesson", back_populates="blocks")


class LessonVideo(Base):
    __tablename__ = "lesson_videos"

    id = Column(Integer, primary_key=True)
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(20), nullable=False, default="youtube")  # youtube | mp4
    external_id_or_url = Column(String(1000), nullable=False)
    title_kk = Column(String(500), nullable=True)
    duration_sec = Column(Integer, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lesson = relationship("Lesson", back_populates="videos")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String(20), default="opened", nullable=False)  # opened | in_progress | completed
    last_block_position = Column(Integer, default=0, nullable=False)
    seconds_spent = Column(Integer, default=0, nullable=False)
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_progress"),
    )


class LessonFavourite(Base):
    __tablename__ = "lesson_favourites"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id = Column(
        Integer,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="favourites")
    lesson = relationship("Lesson", back_populates="favourites")

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_fav"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=True)
    delivered = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BroadcastLog(Base):
    __tablename__ = "broadcast_log"

    id = Column(Integer, primary_key=True)
    author_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    lesson_id = Column(
        Integer, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True
    )
    text = Column(Text, nullable=False)
    sent_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
