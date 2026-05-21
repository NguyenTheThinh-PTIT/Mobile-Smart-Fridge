import pathlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from ai_service.config import settings
from ai_service.models.database import engine
from ai_service.routers.suggestion import router as suggestion_router

app = FastAPI(
    title="AI Food Suggestion Service",
    version="1.0.0",
    description="Service goi y mon an thong minh dua tren kho thuc pham, thoi tiet, va sở thich.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suggestion_router)


@app.on_event("startup")
async def startup() -> None:
    # Chay schema migration khi khoi dong lan dau
    # Tat ca SQL deu idempotent nen an toan khi chay lai
    sql_path = pathlib.Path(__file__).parent / "models" / "schema_additions.sql"
    sql_content = sql_path.read_text()

    async with engine.begin() as conn:
        # Tach cac statement va chay tung cai de tranh loi multi-statement
        statements = [s.strip() for s in sql_content.split(";") if s.strip()]
        for stmt in statements:
            await conn.execute(text(stmt))


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
