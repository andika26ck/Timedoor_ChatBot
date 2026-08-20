"""Kelola API key untuk konsumsi API dari luar (widget/CMS).

Jalankan dari folder backend/ dengan RAG_PG_DSN yang benar (menunjuk ke
database aplikasi). Untuk produksi (Railway) pakai DSN publik proxy, mis:
    $env:RAG_PG_DSN="postgresql://...sakura.proxy.rlwy.net:PORT/faqbot"  (PowerShell)
    python manage_api_keys.py create cms-server

Perintah:
    python manage_api_keys.py create <nama> [--rate N]   # buat key baru
    python manage_api_keys.py list                        # daftar semua key
    python manage_api_keys.py revoke <nama>               # cabut (nonaktif)
    python manage_api_keys.py activate <nama>             # aktifkan lagi
    python manage_api_keys.py delete <nama>               # hapus permanen

Nilai key ASLI hanya tampil SEKALI saat 'create'. Simpan baik-baik.
"""
import sys

from app import api_keys


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0

    cmd = argv[0]

    if cmd == "list":
        rows = api_keys.list_keys()
        if not rows:
            print("(belum ada API key)")
        for k in rows:
            status = "aktif" if k["active"] else "dicabut"
            rl = k.get("rate_limit_per_min") or "-"
            print(
                f"- {k['name']}  [{status}]  prefix={k['token_prefix']}...  "
                f"rate/min={rl}  dibuat={k.get('created_at') or '-'}  "
                f"terakhir_dipakai={k.get('last_used_at') or '-'}"
            )
        return 0

    if cmd == "create":
        if len(argv) < 2:
            print("Butuh nama: python manage_api_keys.py create <nama> [--rate N]")
            return 2
        name = argv[1]
        rate = None
        if "--rate" in argv:
            try:
                rate = int(argv[argv.index("--rate") + 1])
            except (ValueError, IndexError):
                print("--rate harus diikuti angka, mis. --rate 120")
                return 2
        try:
            res = api_keys.create_key(name, rate_limit_per_min=rate, created_by="cli")
        except ValueError as exc:
            print(f"Gagal: {exc}")
            return 2
        print("API key berhasil dibuat. SIMPAN sekarang (tidak akan ditampilkan lagi):")
        print(f"  nama : {res['name']}")
        print(f"  key  : {res['token']}")
        if res.get("rate_limit_per_min"):
            print(f"  rate : {res['rate_limit_per_min']} permintaan/menit")
        return 0

    if cmd in ("revoke", "activate", "delete"):
        if len(argv) < 2:
            print(f"Butuh nama: python manage_api_keys.py {cmd} <nama>")
            return 2
        name = argv[1]
        if cmd == "revoke":
            ok = api_keys.revoke_key(name)
            print("Key dicabut (nonaktif)." if ok else "Nama tidak ditemukan.")
        elif cmd == "activate":
            ok = api_keys.activate_key(name)
            print("Key diaktifkan kembali." if ok else "Nama tidak ditemukan.")
        else:
            ok = api_keys.delete_key(name)
            print("Key dihapus permanen." if ok else "Nama tidak ditemukan.")
        return 0 if ok else 1

    print(f"Perintah tidak dikenal: {cmd}")
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
