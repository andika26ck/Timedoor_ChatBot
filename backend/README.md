# Timedoor FAQ Bot - Backend (FastAPI + RAG PostgreSQL/pgvector + Gemini)

Backend API untuk chatbot FAQ internal Timedoor Academy ("Cobee"). Alur RAG:

> dokumen `.md` -> chunk -> embed (Gemini) -> simpan vektor di **PostgreSQL +
> pgvector** -> cari (cosine) -> jawab (Gemini).

Selain tanya-jawab, backend juga mengelola knowledge base (upload/edit/hapus
dokumen), setelan model & system prompt, template jawaban, statistik pertanyaan
populer, dan umpan balik.

## Struktur

```
backend/
├── app/                    # aplikasi FastAPI
│   ├── main.py             # semua endpoint (CORS, /ask, /documents, /settings, ...)
│   ├── config.py           # setelan dasar (API key, model, CORS, chunk)
│   ├── store.py            # lapisan penyimpanan & retrieval (pakai engine)
│   ├── rag.py              # retrieval + susun jawaban + streaming
│   ├── documents.py        # kelola dokumen KB (chunk + embed + registry)
│   ├── registry.py         # metadata dokumen (PostgreSQL, migrasi dari JSON)
│   ├── settings_store.py   # model & system prompt aktif
│   ├── taxonomy.py / classify.py / related.py / topichint.py
│   ├── templates_store.py / stats_store.py / feedback_store.py
│   └── schemas.py / errors.py / models_catalog.py / jsonstore.py
├── engine/                 # paket RAG (indexing + embedding + vector store)
│   ├── __init__.py         # auto-load .env
│   ├── config.py           # setelan engine (env RAG_*)
│   ├── chunker.py          # potong dokumen jadi chunk
│   ├── frontmatter.py      # pisah YAML front-matter dari isi
│   ├── embedder.py         # embedding Gemini (+ mode MOCK)
│   ├── vector_store.py     # PostgreSQL+pgvector & JSONL + ekspor
│   ├── build_index.py      # bangun indeks (resumable via manifest)
│   ├── search.py           # cari chunk relevan (CLI)
│   └── export_index.py     # ekspor indeks ke JSONL portabel
├── data/                   # knowledge base (.md + front-matter YAML)
├── index_cache/            # manifest resumable build (hash dokumen)
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

> Postgres dijalankan lewat `docker-compose.yml` di **root repo**.

## Prasyarat
- Python 3.12+
- Docker Desktop (untuk PostgreSQL + pgvector)
- `GEMINI_API_KEY` dari https://aistudio.google.com/apikey

## Setup cepat (dev lokal)

1. Siapkan `.env`
   ```bash
   cp .env.example .env      # lalu isi GEMINI_API_KEY
   ```
2. Nyalakan PostgreSQL (pgvector) - jalankan dari folder root repo
   ```bash
   docker compose up -d db
   ```
3. Virtualenv + dependency
   ```bash
   python -m venv .venv
   # Windows     : .\.venv\Scripts\Activate.ps1
   # macOS/Linux : source .venv/bin/activate
   pip install -r requirements.txt
   ```
4. Bangun indeks (chunk + embed + simpan ke Postgres) - sekali saja
   ```bash
   python -m engine.build_index
   ```
   Kalau kena rate-limit (429), ulangi perintah yang sama (resumable).
5. Jalankan server
   ```bash
   uvicorn app.main:app --reload
   ```
   Buka http://localhost:8000/docs

## Jalan penuh via Docker (backend + db)

```bash
cp .env.example .env                 # isi GEMINI_API_KEY
docker compose up -d --build         # jalankan db + backend
docker compose run --rm backend python -m engine.build_index   # isi indeks (sekali)
```
API di http://localhost:8000 .

## Endpoint utama

| Method | Path | Fungsi |
| --- | --- | --- |
| GET  | `/health` | status + model + jumlah chunk (badge frontend) |
| POST | `/ask` | jawaban lengkap (retrieval + LLM) + sumber |
| POST | `/ask/stream` | jawaban streaming |
| GET  | `/taxonomy` | daftar domain & topik untuk filter |
| *    | `/documents` | kelola dokumen KB (list, tambah, edit, hapus) |
| POST | `/metadata/suggest` | usulan metadata dokumen (kategori/domain/topik) |
| *    | `/settings` | model penjawab, model klasifikasi, system prompt, chunk |
| GET  | `/models` | daftar model Gemini yang tersedia |
| *    | `/templates` | template jawaban |
| GET  | `/stats/popular` | pertanyaan yang sering diajukan |
| POST | `/feedback` | rekam umpan balik (up/down) sebuah jawaban |

Contoh:
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"bagaimana cara mendaftarkan siswa baru?"}'
```

## Menyambungkan frontend
Di project frontend, set `.env`:
```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

## Menambah / mengubah knowledge base
1. Tambah/edit `.md` di `data/` (boleh pakai front-matter YAML: `judul`,
   `kategori`, `domain`, `label`), atau lewat menu **Dokumen** di dashboard.
2. Untuk perubahan lewat file, jalankan ulang `python -m engine.build_index`
   (hanya dokumen berubah yang di-embed ulang - hemat kuota; hash tersimpan di
   `index_cache/manifest.json`).

## Ekspor vektor (audit / pindah)
```bash
python -m engine.export_index vektor_kb.jsonl
```

## Konfigurasi (environment)
Semua setelan engine lewat env `RAG_*` (lihat `.env.example`). Yang penting:
`GEMINI_API_KEY`, `GEMINI_MODEL`, `RAG_EMBED_MODEL`, `RAG_EMBED_DIM`,
`RAG_STORE_BACKEND` (`postgres`/`jsonl`), `RAG_PG_DSN`, `RAG_PG_TABLE`,
`CORS_ORIGINS`.

## Deploy ke Railway (ringkas)
1. Buat service PostgreSQL (image `pgvector/pgvector` atau aktifkan extension `vector`).
2. Set env: `GEMINI_API_KEY`, `RAG_PG_DSN` (DSN internal Railway),
   `RAG_STORE_BACKEND=postgres`, `CORS_ORIGINS=https://<domain-frontend-mu>`.
3. Deploy backend (Railway membaca `Dockerfile`).
4. Sekali: jalankan `python -m engine.build_index` lewat shell Railway.

## Uji tanpa kuota API (opsional)
```bash
RAG_MOCK_EMBED=1 RAG_STORE_BACKEND=jsonl python -m engine.build_index
RAG_MOCK_EMBED=1 RAG_STORE_BACKEND=jsonl python -m engine.search "jadwal kelas"
```

## Troubleshooting
- **/health `store_configured: false`** -> indeks belum diisi; jalankan
  `python -m engine.build_index`.
- **Gagal konek Postgres** -> pastikan `docker compose up -d db` jalan &
  `RAG_PG_DSN` benar (`...@localhost:5433/...` lokal, `...@db:5432/...` di
  dalam Docker).
- **429 / rate limit saat build** -> ulangi `python -m engine.build_index`
  (resumable; yang sudah selesai dilewati).
