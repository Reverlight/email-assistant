from fastapi import APIRouter

from app.shopify_client import ShopifyClient

router = APIRouter(prefix="/shopify", tags=["shopify"])

from fastapi import APIRouter
import asyncio
import datetime
import os

from app.shopify_client import ShopifyClient

router = APIRouter(prefix="/shopify", tags=["shopify"])


@router.get("/fetch_order_details/{order_id}", name="shopify:fetch_order_details")
async def fetch_order_details(order_id: str):
    async with await ShopifyClient.create() as shopify:
        order = await shopify.fetch_order_details(order_id)
    return {"order": order}


@router.get("/fetch_customer_details/{email}", name="shopify:fetch_customer_details")
async def fetch_customer_details(email: str):
    async with await ShopifyClient.create() as shopify:
        customer = await shopify.fetch_customer(email)
    return {"customer": customer}


@router.post("/refund_order/{order_id}", name="shopify:refund_order")
async def refund_order(order_id: str):
    async with await ShopifyClient.create() as shopify:
        refund_data = await shopify.refund_order(order_id=order_id)
    return {"refund_data": refund_data}
