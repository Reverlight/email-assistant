from fastapi import APIRouter
import asyncio

from fastapi import Depends, HTTPException


from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Email
from app.openai_client import OpenAIClient
from app.db import get_async_db_session

router = APIRouter(prefix="/openai", tags=["openai"])


@router.post("/thread/{thread_id}/summarize", name="openai:summarize")
async def summarize_thread(
    thread_id: str, db: AsyncSession = Depends(get_async_db_session)
):
    result = await db.execute(
        select(Email)
        .where(Email.thread_id == thread_id)
        .order_by(Email.received_date.asc())
    )
    emails = result.scalars().all()

    if not emails:
        raise HTTPException(status_code=404, detail="Thread not found")

    formatted = Email._format_thread(emails)
    client = OpenAIClient()
    summary = await asyncio.to_thread(client.summarize_thread, formatted)
    return {"thread_id": thread_id, "summary": summary}


@router.post("/thread/{thread_id}/actions", name="openai:detect_actions")
async def detect_actions(
    thread_id: str, db: AsyncSession = Depends(get_async_db_session)
):
    result = await db.execute(
        select(Email)
        .where(Email.thread_id == thread_id)
        .order_by(Email.received_date.asc())
    )
    emails = result.scalars().all()

    if not emails:
        raise HTTPException(status_code=404, detail="Thread not found")

    formatted = Email._format_thread(emails)
    client = OpenAIClient()
    actions = await asyncio.to_thread(client.determine_actions, formatted)
    return {"thread_id": thread_id, "actions": actions}
