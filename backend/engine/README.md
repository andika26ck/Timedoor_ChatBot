# engine - paket RAG (indexing + embedding + vector store)

Paket internal backend untuk membangun & memakai indeks vektor knowledge base:

> dokumen `.md` -> chunk -> embed (Gemini) -> simpan vektor (PostgreSQL/pgvector
> atau JSONL) -> cari (cosine) -> ekspor.

Dipakai oleh `app/` (lewat `app/store.py`, `app/documents.py`, `app/rag.py`) dan
bisa juga dijalankan langsung sebagai CLI untuk membangun/menguji indeks.

## Isi

| File | Fungsi |
| --- | --- |
| `config.py` | setelan engine (dibaca dari env `RAG_*`) |
| `frontmatter.py` | pisahkan YAML front-matter dari isi dokumen |
| `chunker.py` | potong dokumen jadi chunk (sadar heading & FAQ) |
| `embedder.py` | embedding Gemini (batching + retry anti-429, mode MOCK) |
| `vector_store.py` | penyimpanan vektor: PostgreSQL+pgvector atau JSONL |
| `build_index.py` | bangun indeks (resumable via `index_cache/manifest.json`) |
| `search.py` | cari chunk relevan (CLI) |
| `export_index.py` | ekspor indeks ke JSONL portabel |

## Pemakaian (CLI, jalankan dari folder `backend/`)

```bash
# environment otomatis memuat backend/.env
python -m engine.build_index                        # bangun / perbarui indeks
python -m engine.search "cara mengganti jadwal kelas"
python -m engine.export_index vektor_kb.jsonl
```

## Konfigurasi (environment `RAG_*`)

| Env | Default | Keterangan |
| --- | --- | --- |
| `RAG_EMBED_MODEL` | `gemini-embedding-001` | Model embedding Gemini |
| `RAG_EMBED_DIM` | `768` | Panjang vektor (3072/1536/768) |
| `RAG_CHUNK_MAX_TOKENS` | `600` | Panjang maksimum chunk |
| `RAG_CHUNK_OVERLAP_TOKENS` | `120` | Tumpang tindih antar chunk |
| `RAG_CHUNK_STRATEGY` | `heading` | Strategi pemotongan (default: sadar heading) |
| `RAG_STORE_BACKEND` | `postgres` | `postgres` atau `jsonl` |
| `RAG_PG_DSN` | - | DSN PostgreSQL (wajib untuk backend `postgres`) |
| `RAG_PG_TABLE` | `faq_kb` | Nama tabel vektor |
| `RAG_INDEX_DIR` | `backend/index_cache` | Tempat manifest & indeks JSONL |
| `RAG_DOCS_DIR` | `backend/data` | Folder dokumen KB (.md) |
| `RAG_MOCK_EMBED` | `0` | `1` = vektor tiruan (tanpa API) |

## Uji offline (tanpa kuota API)

```bash
RAG_MOCK_EMBED=1 RAG_STORE_BACKEND=jsonl python -m engine.build_index
RAG_MOCK_EMBED=1 RAG_STORE_BACKEND=jsonl python -m engine.search "jadwal kelas"
```

## Catatan
- Build bersifat **resumable**: hash tiap dokumen disimpan di
  `index_cache/manifest.json`, jadi hanya dokumen baru/berubah yang di-embed ulang.
- Front-matter YAML tidak ikut di-embed (dijadikan metadata) supaya skor
  kemiripan tidak terkontaminasi.
