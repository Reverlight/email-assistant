import datetime

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.factories import EmailFactory
from app.models import Email


{
  "thread_id": "123",
  "summary": "Sarah Mitchell requested a full refund for order #4821, which she placed on February 24th for a pair of running shoes that arrived on February 27th. She reported quality issues, including a sole that was coming apart and rough stitching. The support team acknowledged her request on February 28th and stated they would review it within 24 hours. As of March 1st, Sarah has followed up, seeking confirmation on the status of her refund."
}

"""
--- Email 1 ---
From: Sarah Mitchell <sarah.mitchell@example.com>
Subject: Refund request for order #4821
Date: 2026-02-28 10:14:00+00:00

Hi,

I placed an order (#4821) on February 24th for a pair of running shoes, size 42.
The shoes arrived yesterday but the quality is nothing like what was shown on the website —
the sole is already coming apart and the stitching looks very rough.

I've been a customer for 2 years and this is the first time I've been disappointed.
I'd like to request a full refund and will send the item back.

My account email is sarah.mitchell@example.com.

Thanks,
Sarah

--- Email 2 ---
From: Support <support@ourstore.com>
Subject: Re: Refund request for order #4821
Date: 2026-02-28 11:30:00+00:00

Hi Sarah,

Thank you for reaching out. We're sorry to hear about the quality issue.
We've logged your refund request for order #4821 and our team will review it within 24 hours.

Best regards,
Support Team

--- Email 3 ---
From: Sarah Mitchell <sarah.mitchell@example.com>
Subject: Re: Refund request for order #4821
Date: 2026-03-01 09:05:00+00:00

Hi, it's been over 24 hours and I haven't heard back.
Can you please confirm when the refund will be processed?

Thanks,
Sarah
"""


"""
{
  "thread_id": "1",
  "actions": [
    {
      "type": "fetch_order_detail",
      "order_id": "4821"
    },
    {
      "type": "fetch_client_detail",
      "customer_email": "sarah.mitchell@example.com"
    },
    {
      "type": "refund_order",
      "order_id": "4821"
    }
  ]
}
"""

# test file
class TestEmails:
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, async_db):
        self.email = await EmailFactory.create(
            async_db,
            google_id="msg_001",
            thread_id="thread_001",
            sender="alice@gmail.com",
        )
        self.email2 = await EmailFactory.create(
            async_db,
            google_id="msg_002",
            thread_id="thread_001",
            sender="bob@gmail.com",
        )

    @pytest.mark.asyncio
    async def test_emails_exist(self, async_db):
        result = await async_db.execute(select(Email))
        emails = result.scalars().all()
        assert len(emails) == 2

    @pytest.mark.asyncio
    async def test_emails_exist(self, async_db):
        result = await async_db.execute(select(Email))
        emails = result.scalars().all()
        assert len(emails) == 2