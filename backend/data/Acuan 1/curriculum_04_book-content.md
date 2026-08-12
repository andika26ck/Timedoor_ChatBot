---
judul: Curriculum Maker - Book Content
kategori: SOP
domain: Curriculum Maker
label: [book-content, sub-level, lesson, material, bahasa]
sumber_asli: Notion - Academy LMS - Knowledge Base > Curriculum Maker - Book Content
terakhir_update: 2026-07-28
---

# Curriculum Maker - Book Content

## Ringkasan
Pengisian konten Book dilakukan secara bertahap dari level teratas ke bawah.

---

## Struktur Hierarki Book
Pengisian konten Book dilakukan secara bertahap dari level teratas ke bawah.
### Sub Level
Pembagian besar dalam Book. Umumnya 1 Sub Level terdiri dari 8 Lesson.
- Isi: **nama Sub Level** saja
- Setiap Sub Level = 1 Student Report yang harus dibuat Teacher
### Topic / Lesson
Pertemuan belajar dalam Sub Level.
- Isi: **nama Lesson** saja
- Bisa ditambahkan **Objectives** — tujuan belajar berupa bullet point
### Material
Konten di dalam Lesson. Ada 3 tipe Material:
<table header-row="true">
<tr>
<td>Tipe</td>
<td>Isi</td>
<td>Keterangan</td>
</tr>
<tr>
<td>Content</td>
<td>WYSIWYG editor</td>
<td>Bisa berisi teks, gambar, dan konten lainnya</td>
</tr>
<tr>
<td>Test</td>
<td>Test ID</td>
<td>Merujuk ke Test dari Master Data Test. 1 Test bisa dipakai di banyak Material berbeda</td>
</tr>
<tr>
<td>Parent Material</td>
<td>Container Sub Material</td>
<td>Tidak berisi konten langsung. Berisi Sub Material yang masing-masing bertipe Content atau Test</td>
</tr>
</table>
> Jika Material bertipe **Parent Material**, semua Book Settings pada Material tersebut otomatis dikunci — konfigurasi dilakukan di level Sub Material masing-masing.
### Sub Material
Konten di dalam Parent Material. Tipe: **Content** atau **Test** (sama seperti Material biasa).
