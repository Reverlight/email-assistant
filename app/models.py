from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

class AuditMixin:
    # The Shared columns class
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now()
    )


class Email(Base, AuditMixin):
    __tablename__ = 'email'
    title: Mapped[str] = mapped_column()
    text: Mapped[str] = mapped_column()
    sender: Mapped[str] = mapped_column()
    thread: Mapped[str] = mapped_column()
    received_date: Mapped[datetime] = mapped_column()
