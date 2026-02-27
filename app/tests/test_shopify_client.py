import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


MOCK_ORDER_RESPONSE = {
  "order": {
    "order": {
      "id": "gid://shopify/Order/6934094708825",
      "name": "#1001",
      "email": None,
      "displayFulfillmentStatus": "FULFILLED",
      "displayFinancialStatus": "PAID",
      "createdAt": "2026-02-27T06:59:48Z",
      "updatedAt": "2026-02-27T09:55:41Z",
      "totalPriceSet": {
        "shopMoney": {
          "amount": "949.95",
          "currencyCode": "USD"
        }
      },
      "lineItems": {
        "edges": [
          {
            "node": {
              "id": "gid://shopify/LineItem/16412149645401",
              "title": "The Inventory Not Tracked Snowboard",
              "quantity": 1,
              "originalUnitPriceSet": {
                "shopMoney": {
                  "amount": "949.95",
                  "currencyCode": "USD"
                }
              }
            }
          }
        ]
      },
      "customer": {
        "id": "gid://shopify/Customer/9182743625817",
        "email": "ayumu.hirano@example.com",
        "firstName": "Ayumu",
        "lastName": "Hirano"
      }
    }
  }
}


@pytest.mark.asyncio
async def test_fetch_order_details(async_client: AsyncClient):
    with patch(
        "app.shopify_client.ShopifyClient.fetch_order_details",
        new_callable=AsyncMock,
        return_value=MOCK_ORDER_RESPONSE["order"],
    ):
        response = await async_client.get("/fetch_order_details/6934094708825")

    assert response.status_code == 200
    data = response.json()

    order = data["order"]['order']
    assert order["id"] == "gid://shopify/Order/6934094708825"
    assert order["name"] == "#1001"
    assert order["email"] is None
    assert order["displayFulfillmentStatus"] == "FULFILLED"
    assert order["displayFinancialStatus"] == "PAID"
    assert order["createdAt"] == "2026-02-27T06:59:48Z"
    assert order["updatedAt"] == "2026-02-27T09:55:41Z"
    assert order["totalPriceSet"]["shopMoney"]["amount"] == "949.95"
    assert order["totalPriceSet"]["shopMoney"]["currencyCode"] == "USD"

    line_items = order["lineItems"]["edges"]
    assert len(line_items) == 1
    assert line_items[0]["node"]["title"] == "The Inventory Not Tracked Snowboard"
    assert line_items[0]["node"]["quantity"] == 1
    assert line_items[0]["node"]["originalUnitPriceSet"]["shopMoney"]["amount"] == "949.95"

    customer = order["customer"]
    assert customer["id"] == "gid://shopify/Customer/9182743625817"
    assert customer["email"] == "ayumu.hirano@example.com"
    assert customer["firstName"] == "Ayumu"
    assert customer["lastName"] == "Hirano"


@pytest.mark.asyncio
async def test_fetch_order_details_not_found(async_client: AsyncClient):
    with patch(
        "app.shopify_client.ShopifyClient.fetch_order_details",
        new_callable=AsyncMock,
        side_effect=Exception("Order not found"),
    ):
        response = await async_client.get("/fetch_order_details/0000000000000")

    assert response.status_code == 404