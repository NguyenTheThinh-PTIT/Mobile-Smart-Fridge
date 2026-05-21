from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from pgvector.sqlalchemy import Vector  # noqa: F401 - phai import de register custom type voi SQLAlchemy

from ai_service.config import settings

# pool_pre_ping=True de detect connection chet truoc khi su dung, tranh loi bi an
# pool_size va max_overflow can dieu chinh theo so luong concurrent request thuc te
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
