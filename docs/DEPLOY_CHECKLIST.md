# Checklist Deploy — Timedoor FAQ Bot (Cobee)

Checklist ringkas untuk deploy backend ke Railway + frontend ke Vercel, dan
verifikasi setelahnya. Centang tiap poin sebelum menganggap rilis selesai.

## A. Backend (Railway)

Railway build dari `backend/Dockerfile` (`$PORT` diisi otomatis).

Environment variable WAJIB:

- [ ] `GEMINI_API_KEY` — API key Gemini (embedding + generate jawaban).
- [ ] `GEMINI_MODEL` — VERIFIKASI nama model valid untuk akunmu. `.env.example`
      & `docker-compose.yml` memakai `gemini-3.5-flash`, sedangkan default kode
      `gemini-flash-latest`. Pastikan model yang dipilih benar-benar ada (uji di
      menu Kelola DB -> Muat ulang daftar); model salah = error 404.
- [ ] `RAG_PG_DSN` — connection string Postgres. Untuk backend pakai DSN privat
      internal Railway; DSN publik proxy hanya untuk akses dari luar (mis. CLI).
- [ ] `RAG_PG_TABLE` — mis. `faq_kb`.
- [ ] `RAG_EMBED_MODEL` (mis. `gemini-embedding-001`) & `RAG_EMBED_DIM` (768).
- [ ] `AUTH_JWT_SECRET` — WAJIB diisi string acak. Kalau kosong, dipakai secret
      dev yang TIDAK aman. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- [ ] `CORS_ORIGINS` — HARUS memuat origin situs standalone di Vercel
      (mis. `https://timedoor-chat-bot-two.vercel.app`) + domain custom bila ada,
      dipisah koma. Embed CMS lewat proxy same-origin tidak butuh ini, tapi situs
      standalone memanggil Railway langsung dari browser -> wajib.

Environment variable integrasi / API key (opsional tapi disarankan):

- [ ] `IDENTITY_PROXY_SECRET` — shared secret dengan proxy CMS. Harus SAMA PERSIS
      dengan env di server CMS supaya header `X-User-*` dipercaya (fail-closed).
- [ ] `PUBLIC_API_REQUIRED=true` bila ingin mewajibkan `X-API-Key` di `/ask` &
      `/ask/stream` (pakai key per-konsumen di tabel `api_keys`).
- [ ] `RATE_LIMIT_PER_MIN` — batas /ask per menit (default 60). Catatan: rate
      limit disimpan di memori per instance; kalau scale > 1 instance, batas
      efektif = limit x jumlah instance.

Sekali jalan setelah deploy pertama / setelah update knowledge base:

- [ ] Bangun indeks vektor: `python -m engine.build_index` (via shell Railway).
- [ ] Buat API key konsumen (kalau proteksi aktif) dengan channel eksplisit:
      - `python manage_api_keys.py create cms-server --channel cms`
      - `python manage_api_keys.py create widget-public --rate 60 --channel web`

## B. Frontend (Vercel)

Vercel build pakai `frontend/vercel.json` (framework vite, rewrite SPA).

- [ ] `VITE_API_URL` — URL backend Railway TANPA garis miring akhir, mis.
      `https://timedoorchatbot-production.up.railway.app`.
- [ ] `VITE_USE_MOCK=false`.
- [ ] (Opsional) `VITE_API_KEY` — hanya bila proteksi API aktif DAN situs
      standalone perlu memanggil backend. Pakai key PUBLIK ber-rate-limit
      (mis. `widget-public`), JANGAN `cms-server` — nilai ini ikut ter-bundle ke
      browser.
- [ ] Pastikan `dist/widget.js` ikut ter-build (`npm run build` menjalankan
      `scripts/build-widget.mjs`). Widget dimuat dari `<VERCEL_URL>/widget.js`.

## C. Integrasi widget di CMS (Pola Proxy)

Detail: `docs/PANDUAN_INTEGRASI_CMS.md`. Ringkas:

- [ ] Proxy CMS meneruskan SEMUA endpoint yang dipakai widget, bukan cuma `/ask`
      & `/ask/stream`: tambahkan `GET /taxonomy`, `GET /stats/popular`,
      `POST /feedback` (allowlist). Kalau tidak, `Sering ditanyakan` & dropdown
      domain akan kosong.
- [ ] `data-api-url` menunjuk ke endpoint proxy CMS (same-origin), bukan Railway.
- [ ] Jangan pernah menaruh API key/secret di HTML.

## D. Verifikasi pasca-deploy

- [ ] `GET <backend>/health` -> OK.
- [ ] Buka situs standalone -> kirim pertanyaan -> jawaban streaming muncul,
      `Sering ditanyakan` & dropdown domain terisi.
- [ ] Login dashboard -> Riwayat Pengguna: percakapan tercatat dengan badge
      channel yang benar (Web/CMS/Embed), bukan `?`.
- [ ] Dari CMS (kalau sudah integrasi): percakapan tercatat atas nama user login
      (bukan `Anonim`) dan badge = CMS.
