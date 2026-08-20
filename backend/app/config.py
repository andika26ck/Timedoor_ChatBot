from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Sengaja diberi default kosong supaya aplikasi tetap bisa start walau
    # .env belum dibuat. Validasinya dilakukan saat key benar-benar dipakai
    # (lihat require_api_key), sehingga pesan errornya jelas bagi user.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    cors_origins: str = "http://localhost:5173"

    # --- Chunking (opsional; override ukuran chunk retrieval) ---
    # Nilai 0 = pakai default engine (RAG_CHUNK_MAX_TOKENS / RAG_CHUNK_OVERLAP_TOKENS
    # di engine/config.py). Nilai > 0 menimpa ukuran chunk saat memotong
    # dokumen sebelum di-embed.
    # Kalau diisi: max harus 100..4096 dan overlap harus lebih kecil dari max.
    chunk_max_tokens: int = 0
    chunk_overlap_tokens: int = 0

    # --- Autentikasi panel admin ---
    # Kunci rahasia untuk menandatangani token login (HS256). WAJIB diisi
    # dengan string acak & dirahasiakan di produksi. Kalau kosong, dipakai
    # secret dev yang TIDAK aman (hanya untuk pengembangan lokal).
    auth_jwt_secret: str = ""
    # Masa berlaku token login (menit). Default 12 jam.
    auth_token_expire_minutes: int = 720
    # Seed admin pertama (opsional): kalau tabel akun masih kosong saat start,
    # akun ini dibuat otomatis. Berguna untuk bootstrap di produksi.
    auth_seed_admin_username: str = ""
    auth_seed_admin_password: str = ""

    # --- Konsumsi API dari luar (widget/CMS) ---
    # Kalau diisi, endpoint chat publik (/ask, /ask/stream) butuh header
    # X-API-Key yang cocok. Kosong = endpoint tetap terbuka (perilaku lama),
    # sehingga menambah env ini tidak memutus akses yang sudah berjalan.
    public_api_key: str = ""
    # Wajibkan API key untuk endpoint chat (/ask, /ask/stream). Kalau False,
    # endpoint tetap terbuka KECUALI public_api_key diisi. Set True bila hanya
    # memakai key per-konsumen (tabel api_keys) tanpa key global.
    public_api_required: bool = False
    # Batas jumlah permintaan /ask per menit untuk pemanggil non-admin (per API
    # key, atau per IP bila tanpa key). 0 = nonaktif.
    rate_limit_per_min: int = 60

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()


def require_api_key() -> str:
    """Ambil API key, atau lempar error yang mudah dipahami kalau belum diisi."""
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY belum diisi. Salin backend/.env.example jadi "
            "backend/.env lalu isi API key dari https://aistudio.google.com/apikey"
        )
    return settings.gemini_api_key
