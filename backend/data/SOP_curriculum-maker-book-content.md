---
Kategori: SOP
Domain: Curriculum Maker
Topik: book-content, sub-level, lesson, material
---

## Curriculum Maker - Book Content

### Ringkasan
Pengisian konten Book dilakukan secara bertahap dari level teratas ke bawah.

---

### Struktur Hierarki Book
Pengisian konten Book dilakukan secara bertahap dari level teratas ke bawah.
#### Sub Level
Pembagian besar dalam Book. Umumnya 1 Sub Level terdiri dari 8 Lesson.
- Isi: **nama Sub Level** saja
- Setiap Sub Level = 1 Student Report yang harus dibuat Teacher
#### Topic / Lesson
Pertemuan belajar dalam Sub Level.
- Isi: **nama Lesson** saja
- Bisa ditambahkan **Objectives** — tujuan belajar berupa bullet point
#### Material
Konten di dalam Lesson. Ada 3 tipe Material:
| Tipe | Isi | Keterangan |
| --- | --- | --- |
| Content | WYSIWYG editor | Bisa berisi teks, gambar, dan konten lainnya |
| Test | Test ID | Merujuk ke Test dari Master Data Test. 1 Test bisa dipakai di banyak Material berbeda |
| Parent Material | Container Sub Material | Tidak berisi konten langsung. Berisi Sub Material yang masing-masing bertipe Content atau Test |
> Jika Material bertipe **Parent Material**, semua Book Settings pada Material tersebut otomatis dikunci — konfigurasi dilakukan di level Sub Material masing-masing.
#### Sub Material
Konten di dalam Parent Material. Tipe: **Content** atau **Test** (sama seperti Material biasa).