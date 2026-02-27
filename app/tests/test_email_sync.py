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
async def test_fetch_and_save_emails(async_client: AsyncClient, async_db: AsyncSession):
    mock_emails = {
        "emails": [
            {
                "subject": "Test Subject 1",
                "body": "Test body 1",
                "snippet": "Test snippet 1",
                "sender": "sender1@example.com",
                "thread_id": "thread-001",
                "received_date": datetime.now(timezone.utc),
            },
            {
                "subject": "Test Subject 2",
                "body": None,
                "snippet": "Fallback snippet",
                "sender": "sender2@example.com",
                "thread_id": "thread-002",
                "received_date": datetime.now(timezone.utc),
            },
        ]
    }

    with patch.object(EmailClient, "fetch_emails", return_value=mock_emails):
        response = await async_client.post(
            "/emails",
        )

    assert response.status_code == 201
    assert response.json() == {"saved": 2}

    result = await async_db.execute(select(Email))
    emails = result.scalars().all()

    assert len(emails) == 2
    assert emails[0].title == "Test Subject 1"
    assert emails[0].text == "Test body 1"
    assert emails[1].text == "Fallback snippet"  # body was None, fell back to snippet
    assert emails[1].sender == "sender2@example.com"
