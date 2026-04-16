from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings


class Base(DeclarativeBase):
    pass


def get_engine():
    settings = get_settings()
    return create_async_engine(settings.database_url, echo=False)


def get_session_factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


engine = get_engine()
AsyncSessionLocal = get_session_factory(engine)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
