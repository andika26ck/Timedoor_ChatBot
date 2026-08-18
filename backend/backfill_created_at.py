"""One-off: isi `created_at` untuk dokumen lama yang belum punya field ini.

`created_at` di-set = `uploaded_at` (perkiraan terbaik dari data yang tersedia),
sehambar dokumen lama tetap menampilkan tanggal upload di UI. Field baru ini
disimpan di kolom `extra` (JSONB), jadi TIDAK butuh migrasi tabel.

Aman dijalankan berulang (idempoten): dokumen yang sudah punya `created_at`
dilewati sehingga tidak menimpa nilai yang sudah benar.

Cara pakai (dari folder `backend/`):

    python backfill_created_at.py

Pastikan environment DB (RAG_PG_DSN, RAG_PG_TABLE, dll.) sama persis dengan
yang dipakai saat menjalankan server, supaya menyasar database yang benar.
"""

from __future__ import annotations

from app import registry


def main() -> None:
    docs = registry.list_docs()
    total = len(docs)
    changed = 0

    for entry in docs:
        if entry.get("created_at"):
            continue  # sudah punya, jangan ditimpa
        entry["created_at"] = entry.get("uploaded_at") or ""
        registry.add_doc(entry)  # upsert by id; created_at masuk ke kolom extra
        changed += 1
        print(f"  + {entry.get('display_name') or entry.get('id')}")

    print(f"\nSelesai. {changed}/{total} dokumen di-backfill created_at.")


if __name__ == "__main__":
    main()
