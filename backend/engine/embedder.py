"""
embedder.py  — Gemini embeddings dengan BATCHING + retry anti-429.

Antarmuka publik TIDAK berubah (dipakai build_index.py & search.py):
  - embed_texts(texts, task_type="RETRIEVAL_DOCUMENT") -> np.ndarray (n, dim)
  - embed_query(text)                                   -> np.ndarray (dim,)

Perbaikan dibanding versi lama:
  * Beberapa teks dikirim dalam satu request (mengurangi jumlah panggilan).
  * Kalau kena 429 (kuota penuh), otomatis tunggu lalu coba lagi beberapa kali
    sebelum menyerah, dengan pesan yang jelas.
"""
from __future__ import annotations

import hashlib
import time
from typing import List

import numpy as np

from . import config

# Berapa banyak teks dikirim dalam SATU request embed.
_BATCH_SIZE = 32
# Lama tunggu (detik) tiap kali kena 429, berurutan.
_RETRY_WAITS = [10, 30, 60, 120]


def _normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm == 0.0:
        return vec
    return vec / norm


def _mock_vector(text: str) -> np.ndarray:
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16) % (2**32)
    rng = np.random.default_rng(seed)
    return _normalize(rng.standard_normal(config.EMBED_DIM).astype(np.float32))


def _is_quota_error(err: Exception) -> bool:
    s = str(err).lower()
    return ("429" in s) or ("resource_exhausted" in s) or ("quota" in s)


def _client():
    from google import genai  # import lokal supaya mode mock tak butuh paket

    return genai.Client(api_key=config.GEMINI_API_KEY)


def _embed_batch_api(texts: List[str], task_type: str) -> List[np.ndarray]:
    from google.genai import types

    client = _client()
    last_err: Exception | None = None
    for attempt, wait in enumerate([0] + _RETRY_WAITS):
        if wait:
            print(
                f"  ...kuota penuh (429). Tunggu {wait}s lalu coba lagi "
                f"(percobaan {attempt}/{len(_RETRY_WAITS)})..."
            )
            time.sleep(wait)
        try:
            resp = client.models.embed_content(
                model=config.EMBED_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=config.EMBED_DIM,
                ),
            )
            out: List[np.ndarray] = []
            for e in resp.embeddings:
                v = np.array(e.values, dtype=np.float32)
                if config.EMBED_DIM != 3072:
                    v = _normalize(v)
                out.append(v)
            return out
        except Exception as err:  # noqa: BLE001
            last_err = err
            if not _is_quota_error(err):
                raise
    raise RuntimeError(
        "Kuota embedding Gemini masih penuh setelah beberapa kali dicoba. "
        "Tunggu kuota reset lalu jalankan ulang; progres yang sudah tersimpan "
        "tidak akan di-embed ulang."
    ) from last_err


def embed_texts(texts, task_type: str = "RETRIEVAL_DOCUMENT"):
    texts = list(texts)
    if not texts:
        return np.zeros((0, config.EMBED_DIM), dtype=np.float32)
    if config.MOCK_EMBED:
        return np.vstack([_mock_vector(t) for t in texts])
    vectors: List[np.ndarray] = []
    for i in range(0, len(texts), _BATCH_SIZE):
        batch = texts[i : i + _BATCH_SIZE]
        vectors.extend(_embed_batch_api(batch, task_type))
    return np.vstack(vectors)


def embed_query(text: str):
    return embed_texts([text], task_type="RETRIEVAL_QUERY")[0]
