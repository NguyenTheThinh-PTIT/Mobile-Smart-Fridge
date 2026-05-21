from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ai_service.config import Settings
from ai_service.schemas.suggestion_schema import SuggestionContext
from ai_service.services.embedding_service import EmbeddingService


class RetrievalService:

    def __init__(
        self,
        db: AsyncSession,
        embedding_service: EmbeddingService,
        settings: Settings,
    ) -> None:
        self.db = db
        self.embedding_service = embedding_service
        self.settings = settings

    def _build_context_query_text(self, ctx: SuggestionContext) -> str:
        """
        Xay dung text mo ta ngu canh nguoi dung de embed thanh query vector.
        Day KHONG phai cau hoi tu nhien - day la mo ta structured de Gemini embedding
        map vao cung vector space voi Recipe document (da embed voi task_type=RETRIEVAL_DOCUMENT).

        Dung tieng Viet khong dau de dong nhat voi format da dung khi index Recipe,
        giam tokenization mismatch giua index time va query time.
        """
        available_names = [
            ctx.food_id_to_name[fid]
            for fid in ctx.inventory_map
            if fid in ctx.food_id_to_name
        ]
        expiring_names = [
            ctx.food_id_to_name[fid]
            for fid in ctx.expiring_soon_ids
            if fid in ctx.food_id_to_name
        ]
        return (
            f"Can goi y mon an cho bua {ctx.meal_type}. "
            f"Thoi tiet: {ctx.weather.description}, nhiet do {ctx.weather.temp_c} do C, "
            f"dieu kien: {ctx.weather.season_hint}. "
            f"Nguyen lieu co san: {', '.join(available_names[:30])}. "
            f"Uu tien dung: {', '.join(expiring_names)} vi sap het han. "
            f"Khau vi: {', '.join(ctx.combined_tastes)}. "
            f"Che do an: {', '.join(ctx.combined_diets) or 'khong gioi han'}."
        )

    async def _dense_search(
        self,
        query_vector: list[float],
        candidate_ids: list[int],
        top_k: int,
    ) -> list[tuple[int, float]]:
        """
        Tim Recipe co embedding gan nhat voi query vector bang cosine similarity.
        Gioi han trong candidate_ids da qua hard filter de tranh retrieve Recipe bi cam.
        Tra ve tat ca chunk type (overview va ingredients), tinh diem tong hop theo recipe_id.
        """
        sql = text("""
            SELECT
                recipe_id,
                MAX(1 - (embedding <=> CAST(:query_vector AS vector))) AS cosine_similarity
            FROM recipe_embeddings
            WHERE recipe_id = ANY(:candidate_ids)
            GROUP BY recipe_id
            ORDER BY cosine_similarity DESC
            LIMIT :top_k
        """)
        result = await self.db.execute(sql, {
            "query_vector": str(query_vector),
            "candidate_ids": candidate_ids,
            "top_k": top_k,
        })
        return [(row.recipe_id, row.cosine_similarity) for row in result.all()]

    async def _sparse_search(
        self,
        available_food_names: list[str],
        candidate_ids: list[int],
        top_k: int,
    ) -> list[tuple[int, float]]:
        """
        Tim Recipe co ten nguyen lieu trung khop voi kho thuc pham bang trigram similarity.
        Chi search tren chunk_type='ingredients' vi chunk do chua danh sach nguyen lieu
        duoc chuan hoa, phu hop voi pg_trgm so sanh.

        Sparse leg bu dap cho truong hop vector search bi miss khi ten nguyen lieu rat cu the
        (vi du: "ca loc" trong inventory nhung query vector khong capture du do specific nay).
        """
        keyword_query = " ".join(available_food_names[:30])

        sql = text("""
            SELECT
                recipe_id,
                MAX(similarity(chunk_content, :keyword_query)) AS trgm_score
            FROM recipe_embeddings
            WHERE recipe_id = ANY(:candidate_ids)
              AND chunk_type = 'ingredients'
              AND chunk_content % :keyword_query
            GROUP BY recipe_id
            ORDER BY trgm_score DESC
            LIMIT :top_k
        """)
        result = await self.db.execute(sql, {
            "keyword_query": keyword_query,
            "candidate_ids": candidate_ids,
            "top_k": top_k,
        })
        return [(row.recipe_id, row.trgm_score) for row in result.all()]

    @staticmethod
    def _reciprocal_rank_fusion(
        dense_results: list[tuple[int, float]],
        sparse_results: list[tuple[int, float]],
        k: int = 60,
    ) -> list[int]:
        """
        Ket hop ranking tu dense va sparse leg ma khong can chuan hoa score ve cung scale.
        k=60 la hang so empirically tot duoc su dung rong rai trong cac he thong production
        (nguon: Cormack et al. 2009 "Reciprocal Rank Fusion outperforms Condorcet and individual
        Rank Learning Methods").
        RRF uu viet hon score averaging vi no khong bi anh huong boi su chenh lech scale giua
        cosine similarity (0-1) va trigram score (0-1 nhung phan phoi khac).
        """
        rrf_scores: dict[int, float] = {}

        for rank, (recipe_id, _) in enumerate(dense_results):
            rrf_scores[recipe_id] = rrf_scores.get(recipe_id, 0.0) + 1.0 / (k + rank + 1)

        for rank, (recipe_id, _) in enumerate(sparse_results):
            rrf_scores[recipe_id] = rrf_scores.get(recipe_id, 0.0) + 1.0 / (k + rank + 1)

        sorted_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        return [recipe_id for recipe_id, _ in sorted_ids]

    async def hybrid_search(
        self,
        ctx: SuggestionContext,
        candidate_ids: list[int],
    ) -> list[int]:
        query_text = self._build_context_query_text(ctx)
        query_vector = await self.embedding_service.embed_query(query_text)

        available_names = list(ctx.food_id_to_name.values())
        top_k = self.settings.top_k_retrieval

        # AsyncSession khong cho phep nhieu query DB dong thoi tren cung session.
        # Vi vay thuc thi dense va sparse tuan tu de dam bao on dinh.
        dense_results = await self._dense_search(query_vector, candidate_ids, top_k)
        sparse_results = await self._sparse_search(available_names, candidate_ids, top_k)

        return self._reciprocal_rank_fusion(dense_results, sparse_results)
