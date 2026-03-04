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


router = APIRouter(prefix='/shopify', tags=["shopify"])

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


router = APIRouter(prefix='/shopify', tags=["shopify"])

@router.get("/fetch_order_details/{order_id}", name='shopify:fetch_order_details')
async def fetch_order_details(order_id: str):
    async with await ShopifyClient.create() as shopify:
        order = await shopify.fetch_order_details(order_id)
    return {"order": order}


@router.get("/fetch_customer_details/{email}", name='shopify:fetch_customer_details')
async def fetch_customer_details(email: str):
    async with await ShopifyClient.create() as shopify:
        customer = await shopify.fetch_customer(email)
    return {"customer": customer}


@router.post("/refund_order/{order_id}", name='shopify:refund_order')
async def refund_order(order_id: str):
    async with await ShopifyClient.create() as shopify:
        refund_data = await shopify.refund_order(order_id=order_id)
    return {"refund_data": refund_data}