from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.email_sync import EmailClient
from app.models import Email


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
