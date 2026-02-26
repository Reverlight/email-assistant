import asyncio
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import pytest_asyncio

from app.db import Base
from app.main import app
from app import settings


async_engine = create_async_engine(
    url=settings.TEST_QLALCHEMY_DATABASE_URL,
    echo=True,
)

# Create tables at start of session, drop at end
@pytest_asyncio.fixture(scope='function')
async def async_db_engine():
    async with create_async_engine(settings.TEST_QLALCHEMY_DATABASE_URL, echo=True).begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        yield conn
        await conn.run_sync(Base.metadata.drop_all)

# Database session fixture with truncation for isolation
@pytest_asyncio.fixture(scope='function')
async def async_db(async_db_engine) -> AsyncGenerator[AsyncSession, None]:
    # async_sessionmaker is the modern way to do this in SQLAlchemy 2.0
    session_factory = async_sessionmaker(
        bind=async_db_engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    async with session_factory() as session:
        yield session
        
        # Rollback and cleanup
        await session.rollback()
        # Truncate tables to ensure the next test starts fresh
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(text(f'TRUNCATE {table.name} CASCADE;'))
        await session.commit()


@pytest_asyncio.fixture(scope='function')
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    # Use ASGITransport for modern HTTPX (0.21.0+)
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        yield ac
