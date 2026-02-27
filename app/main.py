import asyncio
import datetime
import os

from fastapi import Depends, FastAPI, HTTPException
from httplib2 import Credentials
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_async_db_session
from app.email_sync import EmailClient
from app.models import Email
from app.settings import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_PROJECT_ID
from app.shopify_client import ShopifyClient


app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}

class EmailCreate(BaseModel):
    title: str
    text: str
    sender: str
    thread: str
    received_date: datetime.datetime


@app.post("/emails", status_code=201)
async def read_and_save_emails(db: AsyncSession = Depends(get_async_db_session)):
    email_client = EmailClient()
    result = await asyncio.to_thread(email_client.fetch_emails)  # EmailClient is sync, run in thread
    
    saved = []
    for email_dict in result["emails"]:
        new_email = Email(
            title=email_dict["subject"],
            text=email_dict["body"] or email_dict["snippet"],
            sender=email_dict["sender"],
            thread=email_dict["thread_id"],
            received_date=email_dict["received_date"],
        )
        db.add(new_email)
        saved.append(new_email)
    
    await db.commit()
    return {"saved": len(saved)}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


@app.get("/emails")
def read_root():
    email_client = EmailClient()
    return email_client.fetch_emails()


@app.get("/process_email_thread")
def read_root():
    # RETURN POSSIBLE ACTIONS (with draft placeholders)
    # actions like: refund, get order, summarize (this is always present)
    return {"Hello": "World"}


@app.get("/fetch_order_details/{order_id}")
async def read_root(order_id: str):
    async with await ShopifyClient.create() as shopify:
        try:
            order = await shopify.fetch_order_details(order_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail="Order not found")
    return {'order': order}
