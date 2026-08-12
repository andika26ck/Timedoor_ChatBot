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
