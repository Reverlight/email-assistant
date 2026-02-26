from unittest.mock import patch

from app.email_sync import EmailClient
import pytest
from httpx import AsyncClient
from fastapi import status
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Email
from datetime import datetime, timezone


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
