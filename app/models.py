from datetime import datetime
from typing import Optional, Self

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AuditMixin:
    # The Shared columns class
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )


import datetime

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Gmail's own message ID — used to skip duplicates on re-sync
    google_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    # Gmail thread ID — groups related messages into a conversation
    thread_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=True)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    received_date: Mapped[datetime.datetime] = mapped_column(nullable=True)

    @classmethod
    def _format_thread(cls, emails: list[Self]) -> str:
        """Format a list of Email model instances into a readable thread string."""
        parts = []
        for i, email in enumerate(emails, start=1):
            parts.append(
                f"--- Email {i} ---\n"
                f"From: {email.sender}\n"
                f"Subject: {email.title}\n"
                f"Date: {email.received_date}\n\n"
                f"{email.text or ''}"
            )
        return "\n\n".join(parts)