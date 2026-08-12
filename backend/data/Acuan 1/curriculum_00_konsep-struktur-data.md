---
judul: Curriculum Maker - Konsep Struktur Data
kategori: GLOSSARY
domain: Curriculum Maker
label: [struktur-data, subject, course, package, book]
sumber_asli: Notion - Academy LMS - Knowledge Base > Curriculum Maker - Konsep Struktur Data
terakhir_update: 2026-07-28
---

# Curriculum Maker - Konsep Struktur Data

## Ringkasan
Untuk memahami hierarki konten di sistem, gunakan analogi berikut:

---

## Analogi Struktur
Untuk memahami hierarki konten di sistem, gunakan analogi berikut:
- **Subject** = mata pelajaran (Math, English, Coding, dll) — pengelompokan paling besar
- **Course** = mata pelajaran spesifik (seperti "Matematika Kelas 7") — program belajar yang dikenal dan dipelajari siswa
- **Book** = edisi buku teks dari Course tersebut (seperti "versi Kurikulum Merdeka" atau "versi K13") — inilah yang benar-benar dibuka dan dipelajari siswa di LMS
- **Versi Book** = cetakan ke-n dari edisi tersebut — setiap kali ada perubahan (koreksi typo, perbaikan link, dll) dan di-Publish, itulah versi baru
> Satu Course bisa memiliki beberapa Book (beda format delivery: Offline, Online, Adaptive). Satu Book bisa di-Publish berkali-kali dengan versioning, mirip seperti git commit.
## Hierarki Lengkap
<table header-row="true">
<tr>
<td>Level</td>
<td>Nama</td>
<td>Keterangan</td>
</tr>
<tr>
<td>1</td>
<td>Subject</td>
<td>Pengelompokan program terbesar. Contoh: Math, English, Coding</td>
</tr>
<tr>
<td>2</td>
<td>Course</td>
<td>Program belajar yang dipelajari siswa. Contoh: Coding Xplorer, Math Navigator</td>
</tr>
<tr>
<td>3</td>
<td>Book</td>
<td>Versi spesifik dari Course (Offline / Online / Adaptive). Ini yang dibuka siswa di LMS</td>
</tr>
<tr>
<td>3</td>
<td>Package</td>
<td>Wrapper Course yang siap dijual ke customer. Berisi 1 Course, bahasa, dan durasi. Harga di-set per branch oleh Admin branch</td>
</tr>
<tr>
<td>4</td>
<td>Sub Level</td>
<td>Pembagian besar dalam Book. Umumnya 1 Sub Level = 8 Lesson. Tiap Sub Level = 1 Student Report</td>
</tr>
<tr>
<td>5</td>
<td>Topic / Lesson</td>
<td>Pertemuan belajar dalam Sub Level. Bisa berisi Objectives</td>
</tr>
<tr>
<td>6</td>
<td>Material</td>
<td>Konten di dalam Lesson. Tipe: Content, Test, atau Parent Material</td>
</tr>
<tr>
<td>7</td>
<td>Sub Material</td>
<td>Konten di dalam Parent Material. Tipe: Content atau Test</td>
</tr>
</table>
**Learning Path** adalah jalur belajar yang berisi rangkaian Course-Course. Dibuat secara independent dari struktur di atas.
**Ukuran Book yang umum:**
- 24 Lesson = 3 Sub Level
- 32 Lesson = 4 Sub Level
