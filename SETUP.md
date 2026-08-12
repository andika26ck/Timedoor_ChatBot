# SETUP — Menjalankan FAQ Bot dari Awal

Panduan **command langkah-demi-langkah** untuk membuka project ini di komputer baru.
(Ringkasan dari README, fokus ke perintah.)

## Prasyarat (install sekali)
- Python 3.12+
- Node.js 20+ (diuji di Node 24)
- Docker Desktop (untuk PostgreSQL + pgvector)
- API key Google Gemini: https://aistudio.google.com/apikey

Cek versi:
```bash
python --version
node -v
docker --version
```

---

## 0) Ekstrak project
Ekstrak `faqbot-v2-clean.zip`, lalu masuk ke foldernya:
```bash
cd faqbot-v2
```
> Zip TIDAK berisi `node_modules` & `.venv` (biar kecil) — dibuat di langkah bawah.

---

## 1) Backend (FastAPI + Postgres + Gemini)

**a. Siapkan `.env`** (di zip ini API key sudah terisi; kalau kosong isi manual):
```bash
cd backend
# kalau belum ada file .env:
# cp .env.example .env   lalu isi GEMINI_API_KEY
```

**b. Nyalakan Postgres (pgvector)** — jalankan dari folder **root** repo:
```bash
cd ..
docker compose up -d db
cd backend
```

**c. Virtualenv + dependency:**
```bash
python -m venv .venv
# Windows     : .\.venv\Scripts\Activate.ps1
# macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt
```

**d. Bangun indeks** (chunk + embed dokumen KB -> Postgres) — sekali saja:
```bash
python -m engine.build_index
```
> Kalau kena rate-limit (429), ulangi perintah yang sama (resumable).

**e. Jalankan server:**
```bash
uvicorn app.main:app --reload
```
- Cek kesehatan: http://localhost:8000/health  (harus `store_configured: true`)
- Semua endpoint: http://localhost:8000/docs

---

## 2) Frontend (React + Vite)

Buka terminal **baru** (biarkan backend tetap jalan):
```bash
cd faqbot-v2/frontend
cp .env.example .env        # pastikan VITE_API_URL=http://localhost:8000
npm install
npm run dev                 # buka http://localhost:5173
```
> Mau lihat UI tanpa backend? Set `VITE_USE_MOCK=true` di `frontend/.env`.

---

## 3) Format kode (Prettier)

Sudah dikonfigurasi di `frontend/.prettierrc.json`. Dari folder `frontend/`:
```bash
npm run format          # rapikan semua file (tulis perubahan)
npm run format:check    # cek saja, tanpa mengubah
npm run lint            # cek TypeScript (tsc --noEmit)
```
> Tip VS Code: pasang ekstensi "Prettier - Code formatter" + aktifkan
> `"editor.formatOnSave": true` supaya auto-rapi tiap simpan.

---

## (Opsional) Jalan penuh via Docker (db + backend)
Dari folder **root**:
```bash
echo "GEMINI_API_KEY=isi_key_kamu" > .env
docker compose up -d --build
docker compose run --rm backend python -m engine.build_index   # isi indeks sekali
```
API di http://localhost:8000 . Frontend tetap dijalankan via `npm run dev`.
Di dalam Docker backend konek Postgres lewat `db:5432`; dari laptop lewat `localhost:5433`.

---

## Build produksi (ringkas)
```bash
# Frontend (dashboard)
cd frontend && npm run build            # hasil di dist/

# Widget embeddable (untuk ditempel ke web lain)
npm run build:widget                    # hasil di dist-widget/
```

---

## Catatan penting
- **`.env` backend TIDAK boleh komentar di baris yang sama** dengan nilai — tulis
  komentar di baris sendiri.
- **Postgres:** dari laptop akses lewat `localhost:5433`; antar-container lewat `db:5432`.
- **Tambah dokumen KB:** taruh `.md` di `backend/data/` lalu jalankan ulang
  `python -m engine.build_index`, atau upload lewat menu **Dokumen** di dashboard.
