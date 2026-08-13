# Timedoor FAQ Bot - Monorepo (Backend + Frontend)

Satu repo, satu aplikasi FAQ bot internal Timedoor Academy ("Cobee"):

- **backend/** - FastAPI + RAG (PostgreSQL + pgvector) + Gemini. Meng-embed
  knowledge base, mencari chunk relevan (cosine), lalu menjawab dengan LLM.
- **frontend/** - React + Vite + Tailwind. Dashboard admin (Chat, Kelola
  Dokumen, Kelola DB) sekaligus floating chat widget yang bisa di-embed ke
  website lain.

```
[ frontend (Vite :5173) ] --HTTP--> [ backend (FastAPI :8000) ] --> [ Postgres/pgvector :5433 ]
```

> Panduan detail tiap bagian ada di `backend/README.md` dan `frontend/README.md`.
> File ini ringkasan cara menjalankan keduanya.

## Prasyarat
- Python 3.12+
- Node.js 20+ (diuji di Node 24)
- Docker Desktop (untuk Postgres pgvector)
- API key Google Gemini (https://aistudio.google.com/apikey)

---

## 1) Jalankan Backend

```bash
cd backend
cp .env.example .env          # lalu isi GEMINI_API_KEY
```

Nyalakan Postgres (jalankan dari folder root repo):
```bash
docker compose up -d db       # Postgres pgvector, host port 5433
```

Install dependency & bangun indeks:
```bash
python -m venv .venv
# Windows    : .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m engine.build_index  # chunk + embed dokumen KB -> Postgres
```

Jalankan server:
```bash
uvicorn app.main:app --reload
```

Cek kesehatan: http://localhost:8000/health (harus `store_configured: true`),
atau buka http://localhost:8000/docs untuk semua endpoint.

Endpoint utama: `/ask`, `/ask/stream` (tanya-jawab), `/documents` (kelola KB),
`/settings` (model & prompt), `/templates`, `/stats/popular`, `/taxonomy`,
`/models`, `/health`.

---

## 2) Jalankan Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # buka http://localhost:5173
```

Pastikan `VITE_API_URL` mengarah ke backend (`http://localhost:8000`). Untuk
mencoba tampilan tanpa backend, set `VITE_USE_MOCK=true`.

---

## 3) (Opsional) Full Docker

Menyalakan Postgres + backend sekaligus:
```bash
# buat .env di root berisi GEMINI_API_KEY (dibaca oleh docker compose)
echo "GEMINI_API_KEY=isi_key_kamu" > .env
docker compose up -d db
docker compose run --rm backend python -m engine.build_index   # isi indeks sekali
docker compose up -d backend
```
Di dalam Docker, backend konek ke Postgres lewat `db:5432` (jaringan internal).
Dari laptop kamu, akses Postgres lewat `localhost:5433`.

---

## Catatan penting soal file .env
Parser `.env` backend **tidak mendukung komentar di baris yang sama** dengan nilai.

❌ Salah:
```
RAG_EMBED_DIM=768   # 3072 | 1536 | 768
```
✅ Benar (komentar di baris sendiri):
```
# 3072 | 1536 | 768
RAG_EMBED_DIM=768
```

## Menambah dokumen KB
1. Taruh file `.md` baru di `backend/data/` (boleh pakai front-matter YAML:
   judul, kategori, domain, label), atau upload lewat menu **Dokumen** di dashboard.
2. Kalau menambah lewat file, jalankan lagi `python -m engine.build_index`
   (resumable - hanya dokumen baru/berubah yang diproses).

## Deploy (ringkas)
- **Backend** -> Railway/Render: sediakan Postgres pgvector, set `RAG_PG_DSN`,
  `GEMINI_API_KEY`, dan `CORS_ORIGINS` (tambahkan domain frontend). Jalankan
  `python -m engine.build_index` sekali setelah DB siap.
- **Frontend** -> Vercel: set `VITE_API_URL` ke URL backend produksi.
"# Timedoor_ChatBot" 
