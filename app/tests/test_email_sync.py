import base64
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.email_sync import EmailClient
from app.models import Email



LIST_RESPONSE = {
    "messages": [
        {"id": "19ca22380a9f911d", "threadId": "19ca22380a9f911d"},
        {"id": "19ca1d69e0d54097", "threadId": "19ca1d69e0d54097"},
        {"id": "19c9febbade0e372", "threadId": "19c9febbade0e372"},
        {"id": "19c9fe5ef4b1a8aa", "threadId": "19c9fe5ef4b1a8aa"},
        {"id": "19c9f0227789a6b1", "threadId": "19c9f0227789a6b1"},
        {"id": "19c9e6f2086ed2e5", "threadId": "19c9e6f2086ed2e5"},
        {"id": "19c9e4747f24a2c4", "threadId": "19c9e4747f24a2c4"},
        {"id": "19c9e3cd8d69c64d", "threadId": "19c9e3cd8d69c64d"},
        {"id": "19c9e3600af89827", "threadId": "19c9e3600af89827"},
        {"id": "19c9df4951e8d42b", "threadId": "19c9df4951e8d42b"},
    ],
    "nextPageToken": "15290425416408154659",
    "resultSizeEstimate": 201,
}


html_body = "<html><body><p>Hello, this is a test email.</p></body></html>"
encoded_body = base64.urlsafe_b64encode(html_body.encode()).decode()

REAL_MESSAGE = {
    'id': '19ca22380a9f911d',
    'threadId': '19ca22380a9f911d',
    'snippet': 'After tomorrow, this rate is gone forever...',
    'internalDate': '1772246761000',
    'payload': {
        'mimeType': 'multipart/alternative',
        'headers': [
            {'name': 'Subject', 'value': '24 hours left to lock in 35% off Boost'},
            {'name': 'From', 'value': 'vidIQ <hello@send.vidiq.com>'},
            {'name': 'Date', 'value': 'Sat, 28 Feb 2026 02:46:01 +0000'},
        ],
        'body': {'size': 0},
        'parts': [
            {
                'partId': '0',
                'mimeType': 'text/plain',
                'body': {
                    'size': 2761,
                    'data': encoded_body
                },
            },
        ],
    },
}

@pytest.mark.asyncio
async def test_fetch_emails(async_client: AsyncClient, async_db: AsyncSession):
    with patch("app.email_sync.os.path.exists", return_value=True), \
         patch("app.email_sync.Credentials.from_authorized_user_file"), \
         patch("app.email_sync.build") as mock_build:

        # Set up the chain on the service that build() returns
        mock_service = mock_build.return_value
        mock_service.users.return_value \
            .messages.return_value \
            .list.return_value \
            .execute.return_value = LIST_RESPONSE

        mock_service.users.return_value \
            .messages.return_value \
            .get.return_value \
            .execute.return_value = REAL_MESSAGE

        response = await async_client.post("/emails")

    assert response.status_code == 201
    data = response.json()
    assert data.get('saved') == 10, data
    assert data.get('data', {}).get('emails')[0]['body'] == html_body, data.get('data', {}).get('emails')[0]['body']
    result = await async_db.execute(select(Email))
    emails = result.scalars().all()

    assert len(emails) == 10
