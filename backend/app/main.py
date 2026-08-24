import hmac
import json
import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.concurrency import run_in_threadpool

from app import (
    api_keys,
    audit,
    auth,
    autosplit,
    chatlog,
    classify,
    models_catalog,
    ratelimit,
    registry,
    settings_store,
    stats_store,
    taxonomy,
    templates_store,
    users,
)
from app.config import settings
from app.documents import (
    ALLOWED,
    DATA_DIR,
    add_file,
    add_text,
    delete_doc,
    extract_text,
    find_orphans,
    is_unreadable,
    read_content,
    reset_all,
    update_file,
    update_text,
)
from app.errors import explain
from app.rag import ask, ask_stream, search_debug
from app.store import get_store_name
from app.schemas import (
    AddTextRequest,
    AskRequest,
    ApiUsageResponse,
    AskResponse,
    AuditEvent,
    AutoSplitResponse,
    AutoSplitTextRequest,
    ChatLogMessage,
    ChatSessionSummary,
    DocumentContent,
    DocumentInfo,
    CreateUserRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    SetPasswordRequest,
    UserInfo,
    MetadataSuggestion,
    MetadataSuggestRequest,
    ModelOption,
    OrphanScanRequest,
    PopularQuestion,
    ResetResponse,
    SearchDebugRequest,
    SearchDebugResponse,
    SettingsInfo,
    SettingsUpdate,
    TaxonomyInfo,
    TemplateInfo,
    TemplateRequest,
)

logger = logging.getLogger("faq-bot")


def _http_error(exc: Exception) -> HTTPException:
    """Ubah exception mentah jadi HTTPException dengan pesan ramah user.

    Dipakai di semua endpoint supaya penanganan errornya konsisten dan
    aturannya cukup ditulis sekali di app/errors.py.
    """
    status, detail = explain(exc)
    return HTTPException(status_code=status, detail=detail)


def _actor(request: Request) -> str:
    """Username admin yang sedang login (diset middleware auth). '' bila anonim."""
    user = getattr(request.state, "user", None)
    if isinstance(user, dict):
        return (user.get("username") or "").strip()
    return ""


from app import feedback_store
from app.schemas import FeedbackRequest

app = FastAPI(title="Timedoor FAQ Bot API")


@app.post("/feedback")
def submit_feedback(req: FeedbackRequest) -> dict:
    """Rekam umpan balik (up/down) untuk sebuah jawaban.

    Dipanggil fire-and-forget oleh frontend sehingga cukup mengembalikan
    status ringkas. Data disimpan ke feedback.json lewat feedback_store.
    """
    entry = feedback_store.record(
        req.messageId, req.value, req.question, req.answer
    )
    return {"status": "ok", "value": entry["value"]}


# --------------------------- Autentikasi (guard) ---------------------------
# Endpoint yang boleh diakses tanpa login (dipakai halaman chat end-user).
# Sisanya (dokumen, settings, templates, admin, models, metadata) butuh token.
_PUBLIC_PATHS = {
    "/",
    "/health",
    "/taxonomy",
    "/ask",
    "/ask/stream",
    "/feedback",
    "/auth/login",
    "/auth/register",
    "/auth/me",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/docs/oauth2-redirect",
}


def _is_public_path(path: str) -> bool:
    if path in _PUBLIC_PATHS:
        return True
    # /stats/popular dipakai empty-state chat end-user.
    if path.startswith("/stats/"):
        return True
    return False


# Endpoint chat yang boleh dikonsumsi dari luar (widget/CMS).
_CONSUMABLE_PATHS = {"/ask", "/ask/stream"}


def _api_protection_enabled() -> bool:
    """True bila endpoint chat harus dilindungi API key.

    Aktif jika PUBLIC_API_REQUIRED=true ATAU PUBLIC_API_KEY (key global) diisi.
    Kalau nonaktif, /ask tetap terbuka (hanya dijaga CORS + rate limit).
    """
    return bool(settings.public_api_required or settings.public_api_key)


def _client_ip(request: Request) -> str:
    """IP pemanggil, menghormati X-Forwarded-For (di belakang proxy Railway)."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "?"


async def _resolve_api_key(request: Request) -> dict | None:
    """Kembalikan info konsumen bila X-API-Key valid, atau None.

    Menerima key global (env PUBLIC_API_KEY) dan key per-konsumen (tabel
    api_keys). Lookup DB dijalankan di threadpool agar tidak memblokir loop.
    """
    key = (request.headers.get("x-api-key") or "").strip()
    if not key:
        return None
    if settings.public_api_key and hmac.compare_digest(key, settings.public_api_key):
        return {"name": "global", "rate_limit_per_min": None}
    return await run_in_threadpool(api_keys.verify_token, key)


async def _guard_consumable(request: Request, call_next):
    """Proteksi /ask & /ask/stream: API key (opsional) + rate limit.

    - Admin yang sudah login selalu diizinkan (panel Chat di dashboard).
    - Bila proteksi aktif, wajib X-API-Key valid (global atau per-konsumen).
    - Rate limit diterapkan per konsumen (atau per IP bila tanpa key).
    """
    admin = auth.current_user(request)
    if admin:
        request.state.user = admin
        return await call_next(request)

    consumer_name: str | None = None
    consumer_limit = None
    if _api_protection_enabled():
        info = await _resolve_api_key(request)
        if info is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "API key tidak valid atau tidak disertakan."},
            )
        consumer_name = info.get("name")
        consumer_limit = info.get("rate_limit_per_min")
    request.state.api_consumer = consumer_name

    limit = (
        int(consumer_limit)
        if consumer_limit
        else int(settings.rate_limit_per_min or 0)
    )
    if limit > 0:
        identity = consumer_name or ("ip:" + _client_ip(request))
        allowed, retry_after = ratelimit.hit(identity, limit)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": (
                        "Terlalu banyak permintaan. Coba lagi dalam "
                        f"{retry_after} detik."
                    )
                },
                headers={"Retry-After": str(retry_after)},
            )
    return await call_next(request)


@app.middleware("http")
async def _auth_guard(request: Request, call_next):
    """Gerbang akses: OPTIONS & endpoint publik lewat; /ask dijaga API key +
    rate limit; sisanya wajib login admin.

    Middleware ini sengaja didaftarkan SEBELUM CORSMiddleware supaya CORS tetap
    membungkus respons 401/429 (header CORS ikut terpasang di browser).
    """
    if request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    if path in _CONSUMABLE_PATHS:
        return await _guard_consumable(request, call_next)
    if _is_public_path(path):
        return await call_next(request)
    user = auth.current_user(request)
    if not user:
        return JSONResponse(
            status_code=401,
            content={
                "detail": "Sesi tidak valid atau kedaluwarsa. Silakan login lagi."
            },
        )
    # Endpoint non-publik = area admin. Akun role "user" (end-user chatbot)
    # tidak boleh menembus ke sini meski token-nya valid.
    if user.get("role") != "admin":
        return JSONResponse(
            status_code=403,
            content={"detail": "Akun ini tidak punya akses admin."},
        )
    request.state.user = user
    return await call_next(request)


@app.on_event("startup")
def _seed_admin_on_startup() -> None:
    """Buat admin pertama dari environment bila tabel akun masih kosong."""
    try:
        users.ensure_seed_admin()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Seed admin saat startup gagal: %s", exc)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip() for o in settings.cors_origins.split(",") if o.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------- Autentikasi (endpoint) ---------------------------


@app.post("/auth/login", response_model=LoginResponse)
def login_endpoint(req: LoginRequest):
    """Login admin: verifikasi username+password, kembalikan token akses."""
    user = users.authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Username atau password salah.")
    users.touch_login(user["username"])
    token = auth.create_access_token(
        user["username"], user["role"], name=user.get("name")
    )
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/auth/register", response_model=LoginResponse)
def register_endpoint(req: RegisterRequest):
    """Registrasi mandiri end-user chatbot (role='user') lalu auto-login."""
    try:
        user = users.register_user(req.email, req.password, req.name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    users.touch_login(user["username"])
    token = auth.create_access_token(
        user["username"], user["role"], name=user.get("name")
    )
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/auth/me", response_model=MeResponse)
def me_endpoint(request: Request):
    """Kembalikan user aktif bila token valid (dipakai frontend saat mount)."""
    user = auth.current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sesi tidak valid.")
    return {"user": user}


def _save_upload(file: UploadFile) -> Path:
    """Validasi format lalu simpan file upload ke folder data/."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Format {ext or '(kosong)'} tidak didukung. "
                f"Gunakan: {', '.join(sorted(ALLOWED))}."
            ),
        )
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / Path(file.filename).name
    with dest.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return dest


def _validate_text(req: AddTextRequest) -> tuple[str, str]:
    filename = req.filename.strip()
    content = req.content.strip()
    if not filename:
        raise HTTPException(status_code=422, detail="Nama file tidak boleh kosong.")
    if not content:
        raise HTTPException(status_code=422, detail="Isi teks tidak boleh kosong.")
    return filename, content


def _split_csv(value: str) -> list[str]:
    return [s.strip() for s in (value or "").split(",") if s.strip()]


def _meta_from_form(
    category: str, domain: str, topics: str, summary: str, related: str
) -> dict:
    return {
        "category": (category or "").strip(),
        "domain": (domain or "").strip(),
        "topics": _split_csv(topics),
        "summary": (summary or "").strip(),
        "related": _split_csv(related),
    }


def _meta_from_text(req: AddTextRequest) -> dict:
    return {
        "category": (req.category or "").strip(),
        "domain": (req.domain or "").strip(),
        "topics": [t.strip() for t in req.topics if t.strip()],
        "summary": (req.summary or "").strip(),
        "related": [r.strip() for r in req.related if r.strip()],
        "source_group": (req.source_group or "").strip(),
    }


def _history_payload(req: AskRequest) -> list[dict]:
    """Ambil riwayat percakapan dari request untuk fitur multi-turn.

    Hanya menyertakan giliran user/assistant yang berisi teks, dibatasi ke
    beberapa pesan terakhir supaya prompt tetap ramping.
    """
    out: list[dict] = []
    for turn in (req.history or [])[-12:]:
        text = (turn.text or "").strip()
        role = (turn.role or "").strip().lower()
        if not text or role not in ("user", "assistant"):
            continue
        out.append({"role": role, "text": text})
    return out


# Header identitas yang di-inject oleh proxy CMS tepercaya (server-side).
# LEBIH DIPERCAYA daripada field body: user biasa lewat proxy tidak bisa
# mengubahnya karena proxy yang mengisi berdasarkan sesi login CMS.
_ID_HEADER = "X-User-Id"
_NAME_HEADER = "X-User-Name"
_EMAIL_HEADER = "X-User-Email"
_PROXY_SECRET_HEADER = "X-Proxy-Secret"


def _identity_fields(
    request: Request, req: AskRequest
) -> tuple[str | None, str | None, str | None, str | None]:
    """Tentukan identitas user untuk log. Return (id, name, email, source).

    Prioritas:
      1. Header `X-User-*` dari proxy CMS (source="proxy") — paling dipercaya.
         Bila `identity_proxy_secret` diset, header ini hanya diterima kalau
         `X-Proxy-Secret` cocok (mencegah spoof via panggilan langsung ke API).
      2. Field body `user_*` dari embed (source="embed") — fallback, bisa
         dipalsukan dari browser, jadi hanya untuk embed langsung tanpa proxy.
      3. Tidak ada → anonim (semua None).
    """
    # 0. Sesi login terverifikasi (JWT) — identitas PALING tepercaya karena
    #    ditandatangani server, bukan dikirim mentah dari browser.
    acct = auth.current_user(request)
    if acct and acct.get("role") == "user":
        email = (acct.get("username") or "").strip() or None
        name = (acct.get("name") or "").strip() or None
        return (email, name, email, "account")

    h = request.headers
    h_id = (h.get(_ID_HEADER) or "").strip()
    h_name = (h.get(_NAME_HEADER) or "").strip()
    h_email = (h.get(_EMAIL_HEADER) or "").strip()
    if h_id or h_name or h_email:
        expected = (settings.identity_proxy_secret or "").strip()
        supplied = (h.get(_PROXY_SECRET_HEADER) or "").strip()
        if not expected or hmac.compare_digest(expected, supplied):
            return (h_id or None, h_name or None, h_email or None, "proxy")
        # Secret diset tapi tidak cocok: JANGAN percaya header ini.
        logger.warning("X-User-* diabaikan: X-Proxy-Secret tidak cocok.")

    b_id = (req.user_id or "").strip()
    b_name = (req.user_name or "").strip()
    b_email = (req.user_email or "").strip()
    if b_id or b_name or b_email:
        return (b_id or None, b_name or None, b_email or None, "embed")

    return (None, None, None, None)


def _log_chat(
    req: AskRequest, question: str, answer: str, request: Request
) -> None:
    """Catat percakapan ke log (best-effort) untuk tracking sisi admin.

    Identitas diambil dari header proxy (`X-User-*`) atau field body embed;
    kosong = anonim (hanya session_id). Kegagalan pencatatan tidak boleh
    mengganggu jawaban ke user.
    """
    sid = (req.session_id or "").strip()
    uid, uname, uemail, usrc = _identity_fields(request, req)
    chatlog.log_message(
        sid, "user", question, req.domain, req.topic,
        user_id=uid, user_name=uname, user_email=uemail, source=usrc,
    )
    if (answer or "").strip():
        chatlog.log_message(
            sid, "assistant", answer, req.domain, req.topic,
            user_id=uid, user_name=uname, user_email=uemail, source=usrc,
        )


def _audit_api_usage(request: Request, action: str, req: AskRequest) -> None:
    """Catat pemakaian API per konsumen (best-effort).

    Hanya dicatat bila pemanggil memakai API key (bukan admin/anonim). Dipakai
    untuk audit 'siapa memanggil API dan kapan' di tabel audit_log.
    """
    consumer = getattr(request.state, "api_consumer", None)
    if not consumer:
        return
    audit.record(
        username=f"api:{consumer}",
        action=f"api.{action}",
        target=f"/{action.replace('_', '/')}",
        target_id=(req.session_id or "").strip() or None,
        details={"domain": req.domain or "", "topic": req.topic or ""},
    )


@app.get("/")
def root():
    return {"service": "Timedoor FAQ Bot API", "docs": "/docs"}


@app.get("/health")
def health():
    """Dipakai frontend untuk menampilkan badge status koneksi.

    store_configured = False berarti server hidup tapi knowledge base belum
    diindeks, sehingga UI bisa membedakannya dari "server mati".
    """
    return {
        "status": "ok",
        "model": settings_store.get_model(),
        "store_configured": bool(get_store_name()),
    }


@app.get("/taxonomy", response_model=TaxonomyInfo)
def get_taxonomy():
    """Daftar kategori, domain (Level 3), & topik (Level 1) untuk dropdown UI.

    Kategori dan domain diambil dari taksonomi tetap. Topik sengaja diambil
    dari dokumen yang benar-benar sudah ter-index, supaya dropdown tidak
    pernah menawarkan topik yang hasilnya kosong.
    """
    topics: list[str] = []
    topics_by_domain: dict[str, list[str]] = {}
    for doc in registry.list_docs():
        d = (doc.get("domain") or "").strip()
        for raw in doc.get("topics") or []:
            t = (raw or "").strip()
            if not t:
                continue
            if t not in topics:
                topics.append(t)
            if d:
                bucket = topics_by_domain.setdefault(d, [])
                if t not in bucket:
                    bucket.append(t)
    # Urutkan isi tiap bucket supaya tampilan di UI konsisten.
    for bucket in topics_by_domain.values():
        bucket.sort(key=str.lower)
    return {
        "categories": taxonomy.CATEGORIES,
        "domains": taxonomy.DOMAINS,
        "topics": sorted(topics, key=str.lower),
        "topics_by_domain": topics_by_domain,
    }


# ------------------------------ Chat ------------------------------


@app.post("/ask", response_model=AskResponse)
def ask_endpoint(req: AskRequest, request: Request):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Pertanyaan tidak boleh kosong.")
    try:
        result = ask(question, req.domain, req.topic, history=_history_payload(req))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memproses pertanyaan")
        raise _http_error(exc) from exc
    # catat frekuensi hanya kalau berhasil, untuk pertanyaan populer dinamis
    stats_store.record_question(question)
    answer_text = (
        result.get("answer", "")
        if isinstance(result, dict)
        else getattr(result, "answer", "")
    )
    _log_chat(req, question, answer_text or "", request)
    _audit_api_usage(request, "ask", req)
    return result


@app.post("/ask/stream")
def ask_stream_endpoint(req: AskRequest, request: Request):
    """Versi streaming dari /ask, memakai Server-Sent Events (SSE).

    Tiap baris berbentuk `data: {json}` dengan field `type`:
      text      -> potongan jawaban yang harus ditambahkan ke layar
      citations -> daftar sitasi (dikirim sekali, di akhir)
      error     -> gagal; `value` sudah berupa pesan ramah user
      done      -> stream selesai dengan sukses

    Error TIDAK dikirim sebagai HTTP status karena status sudah terkunci
    begitu byte pertama terkirim. Jadi error disampaikan sebagai event.
    Endpoint /ask yang lama tetap ada dan tidak berubah.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Pertanyaan tidak boleh kosong.")

    history = _history_payload(req)

    def sse(payload: dict) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    def event_source():
        answer_parts: list[str] = []
        try:
            for event in ask_stream(question, req.domain, req.topic, history=history):
                if isinstance(event, dict) and event.get("type") == "text":
                    value = event.get("value")
                    if isinstance(value, str):
                        answer_parts.append(value)
                yield sse(event)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Gagal memproses pertanyaan (stream)")
            _status, detail = explain(exc)
            yield sse({"type": "error", "value": detail})
            return
        # catat frekuensi hanya kalau seluruh stream berhasil
        stats_store.record_question(question)
        _log_chat(req, question, "".join(answer_parts), request)
        _audit_api_usage(request, "ask_stream", req)
        yield sse({"type": "done"})

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # cegah buffering proxy
        },
    )


# --------------------------- Uji Pencarian (retrieval-only) ---------------------------


@app.post("/admin/search", response_model=SearchDebugResponse)
def admin_search_endpoint(req: SearchDebugRequest):
    """Uji Pencarian: jalankan retrieval saja lalu kembalikan chunk + skor.

    TIDAK memanggil model penjawab. Dipakai panel debug admin untuk melihat
    dokumen/chunk mana yang terambil untuk sebuah pertanyaan, berapa skor
    kemiripannya, dan bagaimana filter domain/topik memengaruhi hasil.
    """
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=422, detail="Pertanyaan tidak boleh kosong.")
    history = [
        {"role": t.role, "text": t.text}
        for t in (req.history or [])
        if (t.text or "").strip() and (t.role or "").strip().lower() in ("user", "assistant")
    ]
    try:
        return search_debug(
            question,
            req.domain,
            req.topic,
            top_k=req.top_k,
            history=history,
            condense=req.condense,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menjalankan uji pencarian")
        raise _http_error(exc) from exc


# ----------------------- Riwayat Pengguna (admin) -----------------------


@app.get("/admin/chat-logs/sessions", response_model=list[ChatSessionSummary])
def admin_chat_sessions(
    limit: int = 100,
    offset: int = 0,
    since: str | None = None,
    until: str | None = None,
):
    """Ringkasan per sesi (anonim) untuk tabel Riwayat Pengguna di dashboard.

    Sebelum menampilkan, jalankan retensi 60 hari (hapus permanen percakapan
    yang lebih lama) secara best-effort.
    """
    try:
        try:
            chatlog.purge_old(60)
        except Exception:  # noqa: BLE001
            pass
        return chatlog.list_sessions(limit=limit, offset=offset, since=since, until=until)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memuat daftar sesi chat")
        raise _http_error(exc) from exc


@app.get(
    "/admin/chat-logs/sessions/{session_id}",
    response_model=list[ChatLogMessage],
)
def admin_chat_session_detail(session_id: str):
    """Semua pesan dalam satu sesi, urut waktu."""
    try:
        return chatlog.get_session(session_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memuat detail sesi chat")
        raise _http_error(exc) from exc


@app.delete("/admin/chat-logs/sessions/{session_id}")
def admin_delete_chat_session(session_id: str, request: Request):
    """Hapus permanen satu sesi percakapan beserta seluruh pesannya."""
    try:
        deleted = chatlog.delete_session(session_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menghapus sesi chat")
        raise _http_error(exc) from exc
    if deleted:
        audit.record(
            _actor(request),
            "chatlog.delete",
            target_id=session_id,
            details={"messages": deleted},
        )
    return {"deleted": deleted}


# ----------------------- Log Aktivitas (admin) -----------------------


@app.get("/admin/audit-logs", response_model=list[AuditEvent])
def admin_audit_logs(
    limit: int = 200,
    offset: int = 0,
    since: str | None = None,
    until: str | None = None,
    action: str | None = None,
    username: str | None = None,
):
    """Log aktivitas admin (upload/edit/hapus/setelan) — terbaru di atas.

    Baris pemakaian API (action "api.*") sengaja dikecualikan; lihat tab
    "Penggunaan API" (/admin/api-usage) untuk pemantauan konsumen API.
    """
    try:
        try:
            audit.purge_old(60)
        except Exception:  # noqa: BLE001
            pass
        return audit.list_events(
            limit=limit,
            offset=offset,
            since=since,
            until=until,
            action=action,
            username=username,
            exclude_api=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memuat log aktivitas")
        raise _http_error(exc) from exc


@app.delete("/admin/audit-logs/{event_id}")
def admin_delete_audit_log(event_id: int):
    """Hapus permanen satu baris log aktivitas admin."""
    try:
        deleted = audit.delete_event(event_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menghapus log aktivitas")
        raise _http_error(exc) from exc
    return {"deleted": deleted}


@app.get("/admin/api-usage", response_model=ApiUsageResponse)
def admin_api_usage(
    limit: int = 50,
    offset: int = 0,
    consumer: str | None = None,
    since: str | None = None,
    until: str | None = None,
    days: int = 14,
):
    """Pemantauan pemakaian API per konsumen: ringkasan, tren harian, & tabel.

    Dipakai tab "Penggunaan API" di dashboard. Berbeda dari log aktivitas admin
    yang mencatat perubahan knowledge base, endpoint ini hanya menampilkan
    panggilan API konsumen (widget/CMS) untuk keperluan monitoring.
    """
    try:
        summary = audit.api_usage_summary(days=days)
        rows = audit.list_api_usage(
            limit=limit,
            offset=offset,
            consumer=consumer,
            since=since,
            until=until,
        )
        total = audit.count_api_usage(consumer=consumer, since=since, until=until)
        return {"summary": summary, "rows": rows, "total_rows": total}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memuat penggunaan API")
        raise _http_error(exc) from exc


# --------------------------- Kelola User (admin) ---------------------------


@app.get("/users", response_model=list[UserInfo])
def list_users_endpoint():
    """Daftar semua akun (admin & end-user). Tanpa password_hash.

    'last_active' = waktu paling baru antara login terakhir (last_login_at)
    dan pertanyaan chat terakhir (dari chat_logs, cocok via user_id = email).
    """
    try:
        rows = users.list_users()
        try:
            activity = chatlog.last_activity_by_user()
        except Exception:  # noqa: BLE001
            activity = {}
        for u in rows:
            candidates = [
                t
                for t in (u.get("last_login_at"), activity.get(u.get("username")))
                if t
            ]
            u["last_active"] = max(candidates) if candidates else None
        return rows
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memuat daftar user")
        raise _http_error(exc) from exc


@app.post("/users", response_model=UserInfo)
def create_user_endpoint(req: CreateUserRequest, request: Request):
    """Buat akun baru. Bila username sudah ada, password & role diperbarui."""
    role = (req.role or "user").strip().lower()
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role harus 'user' atau 'admin'.")
    try:
        result = users.create_user(req.username, req.password, role, req.name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    audit.record(
        _actor(request),
        "user.create",
        target=result.get("username"),
        details={"role": role},
    )
    return result


@app.post("/users/{username}/password")
def reset_user_password_endpoint(
    username: str, req: SetPasswordRequest, request: Request
) -> dict:
    """Reset password akun tertentu."""
    try:
        ok = users.set_password(username, req.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not ok:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    audit.record(_actor(request), "user.reset_password", target=username.strip().lower())
    return {"status": "ok"}


@app.delete("/users/{username}")
def delete_user_endpoint(username: str, request: Request) -> dict:
    """Hapus akun. Tidak bisa menghapus diri sendiri atau admin terakhir."""
    target = (username or "").strip().lower()
    if not target:
        raise HTTPException(status_code=400, detail="Username tidak valid.")
    if target == _actor(request):
        raise HTTPException(
            status_code=400,
            detail="Tidak bisa menghapus akun yang sedang dipakai.",
        )
    all_users = users.list_users()
    victim = next((u for u in all_users if u["username"] == target), None)
    if victim is None:
        raise HTTPException(status_code=404, detail="User tidak ditemukan.")
    if victim["role"] == "admin":
        admin_count = sum(1 for u in all_users if u["role"] == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Tidak bisa menghapus admin terakhir.",
            )
    users.delete_user(target)
    audit.record(
        _actor(request),
        "user.delete",
        target=target,
        details={"role": victim["role"]},
    )
    return {"status": "ok"}


# --------------------------- Saran metadata (AI) ---------------------------


@app.post("/metadata/suggest", response_model=MetadataSuggestion)
def suggest_metadata_endpoint(req: MetadataSuggestRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Teks tidak boleh kosong.")
    try:
        return classify.suggest_metadata(text)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menyarankan metadata")
        raise _http_error(exc) from exc


# --------------------------- Dokumen (CRUD) ---------------------------


@app.get("/documents", response_model=list[DocumentInfo])
def list_documents():
    return registry.list_docs()


@app.get("/documents/{doc_id}/content", response_model=DocumentContent)
def document_content(doc_id: str):
    result = read_content(doc_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return result


@app.post("/documents/file", response_model=DocumentInfo)
def create_document_file(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(""),
    domain: str = Form(""),
    topics: str = Form(""),
    summary: str = Form(""),
    related: str = Form(""),
):
    dest = _save_upload(file)
    actor = _actor(request)
    meta = _meta_from_form(category, domain, topics, summary, related)
    meta["actor"] = actor
    try:
        entry = add_file(dest, dest.name, meta)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menambah dokumen")
        raise _http_error(exc) from exc
    audit.record(
        actor,
        "document.create",
        target=entry.get("display_name") or entry.get("filename"),
        target_id=entry.get("id"),
        details={"via": "file", "filename": entry.get("filename")},
    )
    return entry


@app.post("/documents/text", response_model=DocumentInfo)
def create_document_text(req: AddTextRequest, request: Request):
    filename, content = _validate_text(req)
    actor = _actor(request)
    meta = _meta_from_text(req)
    meta["actor"] = actor
    on_conflict = req.on_conflict if req.on_conflict in ("overwrite", "new") else "overwrite"
    try:
        entry = add_text(content, filename, meta, on_conflict)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menambah dokumen teks")
        raise _http_error(exc) from exc
    audit.record(
        actor,
        "document.create",
        target=entry.get("display_name") or entry.get("filename"),
        target_id=entry.get("id"),
        details={"via": "text"},
    )
    return entry


@app.put("/documents/{doc_id}/file", response_model=DocumentInfo)
def update_document_file(
    doc_id: str,
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(""),
    domain: str = Form(""),
    topics: str = Form(""),
    summary: str = Form(""),
    related: str = Form(""),
):
    dest = _save_upload(file)
    actor = _actor(request)
    meta = _meta_from_form(category, domain, topics, summary, related)
    meta["actor"] = actor
    try:
        result = update_file(doc_id, dest, dest.name, meta)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memperbarui dokumen")
        raise _http_error(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    audit.record(
        actor,
        "document.update",
        target=result.get("display_name") or result.get("filename"),
        target_id=result.get("id"),
        details={"via": "file"},
    )
    return result


@app.put("/documents/{doc_id}/text", response_model=DocumentInfo)
def update_document_text(doc_id: str, req: AddTextRequest, request: Request):
    filename, content = _validate_text(req)
    actor = _actor(request)
    meta = _meta_from_text(req)
    meta["actor"] = actor
    try:
        result = update_text(doc_id, content, filename, meta)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memperbarui dokumen teks")
        raise _http_error(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    audit.record(
        actor,
        "document.update",
        target=result.get("display_name") or result.get("filename"),
        target_id=result.get("id"),
        details={"via": "text"},
    )
    return result


@app.delete("/documents/{doc_id}", response_model=DocumentInfo)
def delete_document(doc_id: str, request: Request):
    try:
        result = delete_doc(doc_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menghapus dokumen")
        raise _http_error(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    audit.record(
        _actor(request),
        "document.delete",
        target=result.get("display_name") or result.get("filename"),
        target_id=result.get("id"),
    )
    return result


@app.post("/documents/orphans", response_model=list[DocumentInfo])
def scan_document_orphans(req: OrphanScanRequest):
    """Daftar bagian lama (yatim) untuk satu grup sumber Smart Upload.

    Read-only (tidak menghapus). Frontend memakainya untuk menampilkan
    konfirmasi sebelum menghapus bagian yang judul H2-nya sudah berubah.
    """
    return find_orphans(req.source_group, req.keep_filenames)


# --------------------- Upload Pintar (auto-split) & Reset ---------------------


@app.post("/documents/auto-split/text", response_model=AutoSplitResponse)
def auto_split_text_endpoint(req: AutoSplitTextRequest):
    """Pratinjau: pecah 1 teks besar jadi beberapa bagian per heading H2 (##).

    HANYA membuat usulan (tidak menyimpan apa pun). Frontend menampilkannya,
    user meninjau/mengedit, lalu menyimpan tiap bagian lewat POST /documents/text.
    """
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Teks tidak boleh kosong.")
    try:
        sections = autosplit.build_sections(
            text, classify_meta=req.classify, level=req.level
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memecah dokumen (teks)")
        raise _http_error(exc) from exc
    return {"source_name": req.filename, "count": len(sections), "sections": sections}


@app.post("/documents/auto-split/file", response_model=AutoSplitResponse)
def auto_split_file_endpoint(
    file: UploadFile = File(...),
    classify: bool = Form(True),
    level: int = Form(2),
):
    """Sama seperti versi teks, tapi sumbernya file (PDF/DOCX/MD/TXT)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Format {ext or '(kosong)'} tidak didukung. "
                f"Gunakan: {', '.join(sorted(ALLOWED))}."
            ),
        )
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)
    try:
        text = extract_text(tmp_path)
        if is_unreadable(text):
            raise HTTPException(
                status_code=422,
                detail=f"Tidak bisa mengekstrak teks dari file: {text.strip('()')}",
            )
        sections = autosplit.build_sections(
            text, classify_meta=classify, level=level
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memecah dokumen (file)")
        raise _http_error(exc) from exc
    finally:
        try:
            tmp_path.unlink()
        except OSError:
            pass
    return {"source_name": file.filename or "", "count": len(sections), "sections": sections}


@app.post("/documents/reset", response_model=ResetResponse)
def reset_documents_endpoint(request: Request):
    """Kosongkan seluruh knowledge base (dokumen + indeks vektor + file lokal)."""
    try:
        deleted = reset_all()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal mengosongkan knowledge base")
        raise _http_error(exc) from exc
    audit.record(
        _actor(request),
        "kb.reset",
        target="Seluruh knowledge base",
        details={"deleted": deleted},
    )
    return {"deleted": deleted}


# --------------------------- Template (CRUD) ---------------------------


@app.get("/templates", response_model=list[TemplateInfo])
def list_templates():
    return templates_store.list_templates()


@app.post("/templates", response_model=TemplateInfo)
def create_template(req: TemplateRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Pertanyaan tidak boleh kosong.")
    return templates_store.add_template(text)


@app.put("/templates/{template_id}", response_model=TemplateInfo)
def update_template(template_id: str, req: TemplateRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Pertanyaan tidak boleh kosong.")
    result = templates_store.update_template(template_id, text)
    if result is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan.")
    return result


@app.delete("/templates/{template_id}", response_model=TemplateInfo)
def delete_template(template_id: str):
    result = templates_store.remove_template(template_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan.")
    return result


# --------------------- Pertanyaan populer (dinamis) ---------------------


@app.get("/stats/popular", response_model=list[PopularQuestion])
def popular_questions(limit: int = 6):
    return stats_store.popular(limit)


# --------------------------- Kelola DB (settings) ---------------------------


@app.get("/settings", response_model=SettingsInfo)
def get_settings_endpoint():
    return settings_store.get_settings()


@app.put("/settings", response_model=SettingsInfo)
def update_settings_endpoint(req: SettingsUpdate, request: Request):
    """Ubah system prompt, model, dan/atau chunking. Field kosong dibiarkan.

    Catatan chunking: angka baru TIDAK mengubah dokumen yang sudah ter-index.
    Chunk dibuat sekali saat upload, jadi perlu index ulang:
        python -m scripts.reset_kb
        python -m scripts.index_documents
    """
    try:
        result = settings_store.update_settings(
            system_prompt=req.system_prompt,
            model=req.model,
            classify_model=req.classify_model,
            chunk_max_tokens=req.chunk_max_tokens,
            chunk_overlap_tokens=req.chunk_overlap_tokens,
        )
    except ValueError as exc:
        # Angka chunking di luar rentang yang sah -> 400, bukan 500.
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    changed = [
        field
        for field, value in (
            ("system_prompt", req.system_prompt),
            ("model", req.model),
            ("classify_model", req.classify_model),
            ("chunk_max_tokens", req.chunk_max_tokens),
            ("chunk_overlap_tokens", req.chunk_overlap_tokens),
        )
        if value is not None
    ]
    audit.record(
        _actor(request),
        "settings.update",
        target="System Prompt",
        details={"changed": changed},
    )
    return result


@app.get("/models", response_model=list[ModelOption])
def list_models_endpoint(refresh: bool = False):
    """Daftar model teks yang tersedia, untuk dropdown di menu Kelola DB.

    Kalau panggilan ke API gagal, jangan bikin UI ikut mati: kembalikan saja
    model yang sedang dipakai supaya dropdown tetap punya isi.
    """
    try:
        return models_catalog.list_text_models(force=refresh)
    except Exception as exc:  # noqa: BLE001 - sengaja degradasi halus
        logger.warning("Gagal memuat daftar model: %s", exc)
        current = settings_store.get_settings()
        names = {
            current["model"],
            current["classify_model"],
            current["default_model"],
            current["default_classify_model"],
        }
        return [
            {"name": n, "display_name": n, "warn": False}
            for n in sorted(x for x in names if x)
        ]
