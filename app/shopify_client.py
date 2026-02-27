from app import settings
import httpx

class ShopifyClient:
    def __init__(self, shop: str, access_token: str):
        self.shop = shop
        self.base_url = f"https://{shop}.myshopify.com/admin/api/2024-01/graphql.json"
        self.client = httpx.AsyncClient(
            headers={
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json",
            }
        )

    @classmethod
    async def create(cls) -> "ShopifyClient":
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://{settings.SHOPIFY_SHOP_ID}.myshopify.com/admin/oauth/access_token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.SHOPIFY_CLIENT_ID,
                    "client_secret": settings.SHOPIFY_CLIENT_SECRET,
                }
            )
            response.raise_for_status()
            token = response.json()["access_token"]
        return cls(settings.SHOPIFY_SHOP_ID, token)

    async def _query(self, query: str, variables: dict = None) -> dict:
        response = await self.client.post(
            self.base_url,
            json={"query": query, "variables": variables or {}}
        )
        response.raise_for_status()
        data = response.json()
        if "errors" in data:
            raise Exception(data["errors"])
        return data["data"]

    async def fetch_order_details(self, order_id: str) -> dict:
        query = """
        query GetOrder($id: ID!) {
            order(id: $id) {
                id
                name
                email
                displayFulfillmentStatus
                displayFinancialStatus
                createdAt
                updatedAt
                totalPriceSet { shopMoney { amount currencyCode } }
                lineItems(first: 10) {
                    edges {
                        node {
                            id
                            title
                            quantity
                            originalUnitPriceSet { shopMoney { amount currencyCode } }
                        }
                    }
                }
                customer {
                    id
                    email
                    firstName
                    lastName
                }
            }
        }
        """
        return await self._query(query, {"id": f"gid://shopify/Order/{order_id}"})

    async def refund_order(self, order_id: str, line_items: list = None, shipping_amount: str = None) -> dict:
        query = """
        mutation RefundCreate($input: RefundInput!) {
            refundCreate(input: $input) {
                refund {
                    id
                    totalRefundedSet { shopMoney { amount currencyCode } }
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """
        variables = {
            "input": {
                "orderId": f"gid://shopify/Order/{order_id}",
                "notify": True,
                "refundLineItems": [
                    {
                        "lineItemId": f"gid://shopify/LineItem/{item['line_item_id']}",
                        "quantity": item["quantity"],
                        "restockType": item.get("restock_type", "RETURN"),
                    }
                    for item in (line_items or [])
                ],
                "shipping": {"fullRefund": True} if not shipping_amount else {"amount": shipping_amount},
            }
        }
        data = await self._query(query, variables)
        if data["refundCreate"]["userErrors"]:
            raise Exception(data["refundCreate"]["userErrors"])
        return data["refundCreate"]["refund"]

    async def fetch_customer(self, email: str) -> dict | None:
        query = """
        query GetCustomer($query: String!) {
            customers(first: 1, query: $query) {
                edges {
                    node {
                        id
                        email
                        firstName
                        lastName
                        phone
                        ordersCount
                        totalSpentV2 { amount currencyCode }
                    }
                }
            }
        }
        """
        data = await self._query(query, {"query": f"email:{email}"})
        edges = data["customers"]["edges"]
        return edges[0]["node"] if edges else None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.client.aclose()