import asyncio

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

from ai_service.config import Settings


class EmbeddingService:

    def __init__(self, settings: Settings) -> None:
        genai.configure(api_key=settings.gemini_api_key)
        self.model = settings.embedding_model
        self.dimension = settings.embedding_dimension

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed_document(self, text: str) -> list[float]:
        # Gemini Embedding API yeu cau phan biet task_type:
        # RETRIEVAL_DOCUMENT khi embed noi dung can index (Recipe)
        # Dung sai task_type lam giam chat luong cosine similarity dang ke
        result = await asyncio.to_thread(
            genai.embed_content,
            model=self.model,
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        return result["embedding"]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def embed_query(self, text: str) -> list[float]:
        # RETRIEVAL_QUERY khi embed cau query luc search
        # toi uu vector space cho retrieval, khac voi RETRIEVAL_DOCUMENT
        result = await asyncio.to_thread(
            genai.embed_content,
            model=self.model,
            content=text,
            task_type="RETRIEVAL_QUERY",
        )
        return result["embedding"]
