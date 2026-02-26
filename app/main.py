import datetime
import os

from fastapi import Depends, FastAPI
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

@app.post("/emails/", status_code=201)
async def create_email(
    email_data: EmailCreate, 
    db: AsyncSession = Depends(get_async_db_session)
):
    new_email = Email(**email_data.model_dump())
    db.add(new_email)
    await db.commit()
    await db.refresh(new_email)
    return new_email


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


@app.get("/run_shopify_action")
def read_root():
    # RUN SHOPIFY 
    return {"Hello": "World"}
