---
Kategori: GLOSSARY
Domain: Curriculum Maker
Topik: struktur-data, subject, course, package
Ringkasan: Dokumen ini menjelaskan hierarki dan struktur data konten pembelajaran mulai dari tingkat Subject hingga Sub Material serta konsep Learning Path di sistem.
---

## Curriculum Maker - Konsep Struktur Data

### Ringkasan
Untuk memahami hierarki konten di sistem, gunakan analogi berikut:

---

### Analogi Struktur
Untuk memahami hierarki konten di sistem, gunakan analogi berikut:
- **Subject** = mata pelajaran (Math, English, Coding, dll) — pengelompokan paling besar
- **Course** = mata pelajaran spesifik (seperti "Matematika Kelas 7") — program belajar yang dikenal dan dipelajari siswa
- **Book** = edisi buku teks dari Course tersebut (seperti "versi Kurikulum Merdeka" atau "versi K13") — inilah yang benar-benar dibuka dan dipelajari siswa di LMS
- **Versi Book** = cetakan ke-n dari edisi tersebut — setiap kali ada perubahan (koreksi typo, perbaikan link, dll) dan di-Publish, itulah versi baru
> Satu Course bisa memiliki beberapa Book (beda format delivery: Offline, Online, Adaptive). Satu Book bisa di-Publish berkali-kali dengan versioning, mirip seperti git commit.
### Hierarki Lengkap
| Level | Nama | Keterangan |
| --- | --- | --- |
| 1 | Subject | Pengelompokan program terbesar. Contoh: Math, English, Coding |
| 2 | Course | Program belajar yang dipelajari siswa. Contoh: Coding Xplorer, Math Navigator |
| 3 | Book | Versi spesifik dari Course (Offline / Online / Adaptive). Ini yang dibuka siswa di LMS |
| 3 | Package | Wrapper Course yang siap dijual ke customer. Berisi 1 Course, bahasa, dan durasi. Harga di-set per branch oleh Admin branch |
| 4 | Sub Level | Pembagian besar dalam Book. Umumnya 1 Sub Level = 8 Lesson. Tiap Sub Level = 1 Student Report |
| 5 | Topic / Lesson | Pertemuan belajar dalam Sub Level. Bisa berisi Objectives |
| 6 | Material | Konten di dalam Lesson. Tipe: Content, Test, atau Parent Material |
| 7 | Sub Material | Konten di dalam Parent Material. Tipe: Content atau Test |
**Learning Path** adalah jalur belajar yang berisi rangkaian Course-Course. Dibuat secara independent dari struktur di atas.
**Ukuran Book yang umum:**
- 24 Lesson = 3 Sub Level
- 32 Lesson = 4 Sub Level