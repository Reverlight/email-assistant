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

from app.chatgpt_client import ChatGPTClient
from app.db import get_async_db_session
from app.email_client import EmailClient
from app.models import Email
from app.settings import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROJECT_ID
from app.shopify_client import ShopifyClient


router = APIRouter(prefix='/emails', tags=["emails"])


class EmailCreate(BaseModel):
    title: str
    text: str
    sender: str
    thread: str
    received_date: datetime.datetime


@router.post("", status_code=201, name='emails:sync_emails')
async def sync_emails(db: AsyncSession = Depends(get_async_db_session)):
    """
    Fetch latest emails from Gmail and save new ones to the DB.
    Already-synced emails (matched by google_id) are skipped.
    """
    email_client = EmailClient()
    result = await asyncio.to_thread(email_client.fetch_emails)

    # Load all google_ids that are already stored so we can skip them
    existing_ids_result = await db.execute(select(Email.google_id))
    existing_google_ids = {row for (row,) in existing_ids_result.all()}

    saved = 0
    skipped = 0

    for email_dict in result["emails"]:
        if email_dict["google_id"] in existing_google_ids:
            skipped += 1
            continue

        new_email = Email(
            google_id=email_dict["google_id"],
            thread_id=email_dict["thread_id"],
            title=email_dict["subject"],
            text=email_dict["body"] or email_dict["snippet"],
            sender=email_dict["sender"],
            received_date=email_dict["received_date"],
        )
        db.add(new_email)
        saved += 1

    await db.commit()
    return {"saved": saved, "skipped": skipped}


@router.get("", name='emails:get_emails')
async def get_emails(db: AsyncSession = Depends(get_async_db_session)):
    """
    Return all emails grouped by thread, ordered by most recent activity.
    Each thread contains its messages sorted oldest → newest.

    Response shape:
    {
      "threads": [
        {
          "thread_id": "19ca22380a9f911d",
          "subject": "24 hours left to lock in 35% off Boost",   # from first message
          "last_received": "2026-02-28T02:46:01Z",
          "messages": [
            {
              "id": 1,
              "google_id": "...",
              "sender": "...",
              "text": "...",
              "received_date": "..."
            },
            ...
          ]
        },
        ...
      ]
    }
    """
    result = await db.execute(select(Email).order_by(Email.received_date.asc()))
    emails = result.scalars().all()

    # Group by thread_id
    threads: dict[str, list[Email]] = defaultdict(list)
    for email in emails:
        threads[email.thread_id].append(email)

    # Build response, sorted by most recent message in thread (newest thread first)
    thread_list = []
    for thread_id, messages in threads.items():
        last_message = messages[-1]  # already sorted asc, so last = newest
        thread_list.append(
            {
                "thread_id": thread_id,
                "subject": messages[0].title,  # subject of the first message in thread
                "last_received": last_message.received_date,
                "messages": [
                    {
                        "id": m.id,
                        "google_id": m.google_id,
                        "sender": m.sender,
                        "title": m.title,
                        "text": m.text,
                        "received_date": m.received_date,
                    }
                    for m in messages
                ],
            }
        )

    thread_list.sort(
        key=lambda t: t["last_received"] or datetime.datetime.min, reverse=True
    )

    return {"threads": thread_list}
