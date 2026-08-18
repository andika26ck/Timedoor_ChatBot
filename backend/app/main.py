import json
import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app import (
    autosplit,
    chatlog,
    classify,
    models_catalog,
    registry,
    settings_store,
    stats_store,
    taxonomy,
    templates_store,
)
from app.config import settings
from app.documents import (
    ALLOWED,
    DATA_DIR,
    add_file,
    add_text,
    delete_doc,
    extract_text,
    is_unreadable,
    read_content,
    reset_all,
    update_file,
    update_text,
)
from app.errors import explain
from app.rag import ask, ask_stream
from app.store import get_store_name
from app.schemas import (
    AddTextRequest,
    AskRequest,
    AskResponse,
    AutoSplitResponse,
    AutoSplitTextRequest,
    ChatLogMessage,
    ChatSessionSummary,
    DocumentContent,
    DocumentInfo,
    MetadataSuggestion,
    MetadataSuggestRequest,
    ModelOption,
    PopularQuestion,
    ResetResponse,
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


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip() for o in settings.cors_origins.split(",") if o.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


def _log_chat(req: AskRequest, question: str, answer: str) -> None:
    """Catat percakapan ke log (best-effort) untuk tracking sisi admin.

    Identitas anonim: hanya session_id (dari frontend) + waktu. Kegagalan
    pencatatan tidak boleh mengganggu jawaban ke user.
    """
    sid = (req.session_id or "").strip()
    chatlog.log_message(sid, "user", question, req.domain, req.topic)
    if (answer or "").strip():
        chatlog.log_message(sid, "assistant", answer, req.domain, req.topic)


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
def ask_endpoint(req: AskRequest):
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
    _log_chat(req, question, answer_text or "")
    return result


@app.post("/ask/stream")
def ask_stream_endpoint(req: AskRequest):
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
        _log_chat(req, question, "".join(answer_parts))
        yield sse({"type": "done"})

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # cegah buffering proxy
        },
    )


# ----------------------- Riwayat Pengguna (admin) -----------------------


@app.get("/admin/chat-logs/sessions", response_model=list[ChatSessionSummary])
def admin_chat_sessions(
    limit: int = 100,
    offset: int = 0,
    since: str | None = None,
    until: str | None = None,
):
    """Ringkasan per sesi (anonim) untuk tabel Riwayat Pengguna di dashboard."""
    try:
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
    file: UploadFile = File(...),
    category: str = Form(""),
    domain: str = Form(""),
    topics: str = Form(""),
    summary: str = Form(""),
    related: str = Form(""),
):
    dest = _save_upload(file)
    meta = _meta_from_form(category, domain, topics, summary, related)
    try:
        return add_file(dest, dest.name, meta)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menambah dokumen")
        raise _http_error(exc) from exc


@app.post("/documents/text", response_model=DocumentInfo)
def create_document_text(req: AddTextRequest):
    filename, content = _validate_text(req)
    meta = _meta_from_text(req)
    on_conflict = req.on_conflict if req.on_conflict in ("overwrite", "new") else "overwrite"
    try:
        return add_text(content, filename, meta, on_conflict)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menambah dokumen teks")
        raise _http_error(exc) from exc


@app.put("/documents/{doc_id}/file", response_model=DocumentInfo)
def update_document_file(
    doc_id: str,
    file: UploadFile = File(...),
    category: str = Form(""),
    domain: str = Form(""),
    topics: str = Form(""),
    summary: str = Form(""),
    related: str = Form(""),
):
    dest = _save_upload(file)
    meta = _meta_from_form(category, domain, topics, summary, related)
    try:
        result = update_file(doc_id, dest, dest.name, meta)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memperbarui dokumen")
        raise _http_error(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return result


@app.put("/documents/{doc_id}/text", response_model=DocumentInfo)
def update_document_text(doc_id: str, req: AddTextRequest):
    filename, content = _validate_text(req)
    meta = _meta_from_text(req)
    try:
        result = update_text(doc_id, content, filename, meta)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal memperbarui dokumen teks")
        raise _http_error(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return result


@app.delete("/documents/{doc_id}", response_model=DocumentInfo)
def delete_document(doc_id: str):
    try:
        result = delete_doc(doc_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal menghapus dokumen")
        raise _http_error(exc) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")
    return result


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
def reset_documents_endpoint():
    """Kosongkan seluruh knowledge base (dokumen + indeks vektor + file lokal)."""
    try:
        deleted = reset_all()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Gagal mengosongkan knowledge base")
        raise _http_error(exc) from exc
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
def update_settings_endpoint(req: SettingsUpdate):
    """Ubah system prompt, model, dan/atau chunking. Field kosong dibiarkan.

    Catatan chunking: angka baru TIDAK mengubah dokumen yang sudah ter-index.
    Chunk dibuat sekali saat upload, jadi perlu index ulang:
        python -m scripts.reset_kb
        python -m scripts.index_documents
    """
    try:
        return settings_store.update_settings(
            system_prompt=req.system_prompt,
            model=req.model,
            classify_model=req.classify_model,
            chunk_max_tokens=req.chunk_max_tokens,
            chunk_overlap_tokens=req.chunk_overlap_tokens,
        )
    except ValueError as exc:
        # Angka chunking di luar rentang yang sah -> 400, bukan 500.
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
