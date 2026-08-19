"""Buat / kelola akun admin panel (tabel app_users di PostgreSQL).

Jalankan dari folder backend/ dengan environment yang benar (RAG_PG_DSN
menunjuk ke database yang dipakai aplikasi).

Contoh:
    python create_user.py budi rahasia123          # buat/atur admin 'budi'
    python create_user.py budi rahasia123 admin     # sekaligus set role
    python create_user.py budi                       # password diminta aman
    python create_user.py --list                     # daftar semua akun
    python create_user.py --delete budi              # hapus akun

Untuk produksi (Railway), set env RAG_PG_DSN ke DSN produksi lalu jalankan
lewat `railway run python create_user.py ...`, ATAU cukup pakai seed otomatis:
set AUTH_SEED_ADMIN_USERNAME & AUTH_SEED_ADMIN_PASSWORD di environment, admin
pertama dibuat otomatis saat backend start (bila tabel masih kosong).
"""
import sys
from getpass import getpass

from app import users


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0

    if argv[0] == "--list":
        rows = users.list_users()
        if not rows:
            print("(belum ada akun)")
        for u in rows:
            print(f"- {u['username']} ({u['role']}) dibuat {u.get('created_at') or '-'}")
        return 0

    if argv[0] == "--delete":
        if len(argv) < 2:
            print("Butuh username: python create_user.py --delete <username>")
            return 2
        ok = users.delete_user(argv[1])
        print("Dihapus." if ok else "User tidak ditemukan.")
        return 0 if ok else 1

    username = argv[0]
    password = argv[1] if len(argv) > 1 else getpass("Password: ")
    role = argv[2] if len(argv) > 2 else "admin"
    try:
        u = users.create_user(username, password, role)
    except ValueError as exc:
        print(f"Gagal: {exc}")
        return 2
    print(f"OK. Akun '{u['username']}' ({u['role']}) siap dipakai untuk login.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
