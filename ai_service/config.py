from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    gemini_api_key: str
    embedding_model: str = "models/gemini-embedding-001"
    llm_model: str = "gemini-2.5-flash"
    embedding_dimension: int = 3072

    # so luong candidate lay tu hybrid search truoc khi soft scoring
    # gia tri 20 can bang giua chat luong va latency - du rong de tim du 5+5 mon
    top_k_retrieval: int = 20

    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    openweather_api_key: str
    ai_service_port: int = 8001

    # 30 phut du tuoi cho du bao thoi tiet nhung tranh goi API lien tuc
    weather_cache_ttl_seconds: int = Field(default=1800)

    # 2 gio: kho thuc pham it khi thay doi trong thoi gian ngan, tranh goi LLM lap
    suggestion_cache_ttl_seconds: int = Field(default=7200)

    # nguong "sap het han" de tinh expiring bonus trong scoring
    expiring_threshold_days: int = Field(default=3)

    class Config:
        env_file = ".env"


settings = Settings()
