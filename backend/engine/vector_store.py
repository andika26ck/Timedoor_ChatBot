"""Penyimpanan vektor: PostgreSQL + pgvector (utama) atau JSONL (uji offline).

Semua backend menyediakan antarmuka sama:
    doc_ids / drop_doc / add / save / search / all_records / count.
Dipilih lewat get_store(backend, index_dir) berdasarkan config.STORE_BACKEND.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np


def _cosine(matrix: np.ndarray, q: np.ndarray) -> np.ndarray:
    mn = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-12)
    qn = q / (np.linalg.norm(q) + 1e-12)
    return mn @ qn


class JsonlStore:
    """Simpan semua record di satu file JSONL; pencarian brute-force numpy.

    Backend tanpa dependency eksternal, berguna untuk uji offline / CI.
    """

    def __init__(self, index_dir: Path):
        self.path = Path(index_dir) / "index.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.records: list[dict] = []
        if self.path.exists():
            with self.path.open(encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self.records.append(json.loads(line))

    def doc_ids(self) -> set[str]:
        return {r["doc_id"] for r in self.records}

    def drop_doc(self, doc_id: str) -> None:
        self.records = [r for r in self.records if r["doc_id"] != doc_id]

    def add(self, rows: list[dict]) -> None:
        self.records.extend(rows)

    def save(self) -> None:
        with self.path.open("w", encoding="utf-8") as f:
            for r in self.records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")

    def search(self, query_vec: list[float], top_k: int = 5) -> list[dict]:
        if not self.records:
            return []
        mat = np.asarray([r["vector"] for r in self.records], dtype=float)
        sims = _cosine(mat, np.asarray(query_vec, dtype=float))
        order = np.argsort(-sims)[:top_k]
        hits = []
        for i in order:
            r = dict(self.records[int(i)])
            r["score"] = float(sims[int(i)])
            hits.append(r)
        return hits

    def all_records(self) -> list[dict]:
        return list(self.records)

    def count(self) -> int:
        return len(self.records)


class PgVectorStore:
    """Simpan vektor di PostgreSQL + ekstensi pgvector (backend utama).

    Interface identik dengan JsonlStore sehingga bisa langsung dipakai tanpa
    mengubah build_index / api / search / export_index.

    Koneksi & nama tabel dibaca dari config:
      - RAG_PG_DSN   : mis. postgresql://user:pass@localhost:5432/faqbot
      - RAG_PG_TABLE : default "faq_kb"
    Parameter index_dir diabaikan (tidak relevan untuk database).
    """

    def __init__(self, index_dir: Path | None = None):
        import psycopg
        from pgvector.psycopg import register_vector

        from . import config

        if not config.PG_DSN:
            raise RuntimeError(
                "RAG_PG_DSN belum diisi. Set ke connection string PostgreSQL, "
                "mis. postgresql://user:pass@localhost:5432/faqbot"
            )
        self.table = config.PG_TABLE
        self.dim = config.EMBED_DIM
        self.conn = psycopg.connect(config.PG_DSN, autocommit=True)
        # pastikan ekstensi + tabel + index ada (aman dijalankan berulang)
        self.conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        register_vector(self.conn)
        self.conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {self.table} (
                id        TEXT PRIMARY KEY,
                doc_id    TEXT,
                text      TEXT,
                embedding vector({self.dim}),
                metadata  JSONB
            )
            """
        )
        self.conn.execute(
            f"CREATE INDEX IF NOT EXISTS {self.table}_embedding_idx "
            f"ON {self.table} USING hnsw (embedding vector_cosine_ops)"
        )
        self.conn.execute(
            f"CREATE INDEX IF NOT EXISTS {self.table}_doc_id_idx "
            f"ON {self.table} (doc_id)"
        )

    def doc_ids(self) -> set[str]:
        rows = self.conn.execute(
            f"SELECT DISTINCT doc_id FROM {self.table}"
        ).fetchall()
        return {r[0] for r in rows if r[0] is not None}

    def drop_doc(self, doc_id: str) -> None:
        self.conn.execute(
            f"DELETE FROM {self.table} WHERE doc_id = %s", (doc_id,)
        )

    def add(self, rows: list[dict]) -> None:
        if not rows:
            return
        from psycopg.types.json import Json

        params = [
            (
                r["id"],
                r.get("doc_id"),
                r.get("text"),
                np.asarray(r["vector"], dtype=np.float32),
                Json(r.get("metadata") or {}),
            )
            for r in rows
        ]
        with self.conn.cursor() as cur:
            cur.executemany(
                f"""
                INSERT INTO {self.table} (id, doc_id, text, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    doc_id   = EXCLUDED.doc_id,
                    text     = EXCLUDED.text,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
                """,
                params,
            )

    def save(self) -> None:
        pass  # autocommit aktif; tidak perlu commit manual

    def search(self, query_vec: list[float], top_k: int = 5) -> list[dict]:
        qv = np.asarray(query_vec, dtype=np.float32)
        rows = self.conn.execute(
            f"""
            SELECT id, doc_id, text, metadata, 1 - (embedding <=> %s) AS score
            FROM {self.table}
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (qv, qv, top_k),
        ).fetchall()
        hits = []
        for r in rows:
            hits.append(
                {
                    "id": r[0],
                    "doc_id": r[1],
                    "text": r[2],
                    "metadata": r[3] or {},
                    "score": float(r[4]),
                }
            )
        return hits

    def all_records(self) -> list[dict]:
        rows = self.conn.execute(
            f"SELECT id, doc_id, text, embedding, metadata FROM {self.table}"
        ).fetchall()
        out = []
        for r in rows:
            vec = r[3]
            out.append(
                {
                    "id": r[0],
                    "doc_id": r[1],
                    "text": r[2],
                    "vector": (
                        vec.to_list()
                        if hasattr(vec, "to_list")
                        else list(np.asarray(vec))
                    )
                    if vec is not None
                    else [],
                    "metadata": r[4] or {},
                }
            )
        return out

    def count(self) -> int:
        row = self.conn.execute(f"SELECT COUNT(*) FROM {self.table}").fetchone()
        return int(row[0]) if row else 0


def get_store(backend: str, index_dir: Path):
    if backend in ("postgres", "postgresql", "pgvector"):
        return PgVectorStore(index_dir)
    if backend == "jsonl":
        return JsonlStore(index_dir)
    raise ValueError(
        f"backend tak dikenal: {backend!r} (pakai 'postgres' atau 'jsonl')"
    )


def export_jsonl(records: list[dict], out_path: Path) -> int:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(records)
