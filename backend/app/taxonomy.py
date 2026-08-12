"""Taksonomi dokumen knowledge base Timedoor Academy.

- CATEGORIES: jenis dokumen untuk konvensi penamaan file (prefix), sesuai brief
  (SOP_, RULES_, FAQ_, GLOSSARY_).
- DOMAINS: pengelompokan per area sistem (Level 3 di brief) untuk filter
  pencarian. Nilai ini HARUS sama persis dengan DOMAINS di
  frontend/src/lib/api.ts, karena dipakai bersama oleh dropdown UI dan
  fitur saran metadata otomatis (classify.py).

PERUBAHAN: menambah "Tentang Sistem" untuk dokumen pengantar/glossary yang
tidak spesifik ke satu peran (mis. 00_tentang-sistem.md).
"""

CATEGORIES = ["SOP", "RULES", "FAQ", "GLOSSARY"]

DOMAINS = [
    "Tentang Sistem",
    "CMS Admin",
    "Teacher",
    "Curriculum Maker",
    "System Rules",
    "Akun & Akses",
    "Known Risks",
]
