import pytest
from httpx import AsyncClient
from fastapi import status

@pytest.mark.asyncio
async def test_read_root(async_client: AsyncClient):
    """
    Test the root endpoint returns 200 OK and the correct JSON body.
    """
    # Act: Send a GET request to the root URL
    response = await async_client.get("/")

    # Assert: Check the status code
    assert response.status_code == status.HTTP_200_OK
    
    # Assert: Check the response body
    assert response.json() == {"Hello": "World"}


import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Email
from datetime import datetime

@pytest.mark.asyncio
async def test_create_email_model(async_client: AsyncClient, async_db: AsyncSession):
    # 1. Prepare dummy data
    payload = {
        "title": "Test Email",
        "text": "This is a dummy body",
        "sender": "test@example.com",
        "thread": "thread-123",
        "received_date": datetime.now().isoformat()
    }

    # 2. Send request to the API
    response = await async_client.post("/emails/", json=payload)
    
    # 3. Assert API response
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert "id" in data
    assert "created_at" in data  # Verifies AuditMixin worked

    # 4. Verify directly in the DB using the async_db session
    query = select(Email).where(Email.id == data["id"])
    result = await async_db.execute(query)
    db_email = result.scalar_one_or_none()
    
    assert db_email is not None
    assert db_email.sender == "test@example.com"