from fastapi import APIRouter
import asyncio
from collections import defaultdict
import datetime
import os

from fastapi import Depends, FastAPI, HTTPException
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from httplib2 import Credentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.openai_client import OpenAIClient
from app.db import get_async_db_session
from app.email_client import EmailClient
from app.models import Email
from app.settings import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROJECT_ID
from app.shopify_client import ShopifyClient


router = APIRouter(prefix='/openai', tags=["openai"])


@router.post("/thread/{thread_id}/summarize", name='openai:summarize')
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


@router.post("/thread/{thread_id}/actions", name='openai:detect_actions')
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