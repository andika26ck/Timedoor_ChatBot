---
judul: Curriculum Maker - Book Settings
kategori: SOP
domain: Curriculum Maker
label: [book-settings, rewards, summary, publish]
sumber_asli: Notion - Academy LMS - Knowledge Base > Curriculum Maker - Book Settings
terakhir_update: 2026-07-28
---

# Curriculum Maker - Book Settings

## Ringkasan
Book Settings mengatur **behavior** dari setiap struktur Book — bukan isi kontennya. Settings ini bersifat language-agnostic (berlaku untuk semua bahasa), kecuali Google Form URL.

---

## Overview
Book Settings mengatur **behavior** dari setiap struktur Book — bukan isi kontennya. Settings ini bersifat language-agnostic (berlaku untuk semua bahasa), kecuali Google Form URL.
Settings tersedia untuk level: **Topic**, **Material (Content/Test)**, dan **Sub Material**.
> Material bertipe **Parent Material** tidak bisa di-setting — semua dikonfigurasi di Sub Material-nya.
## Settings per Level
### Topic / Lesson
| Setting | Keterangan |
| --- | --- |
| Report Reminder | Jika dicentang, Lesson ini akan muncul sebagai reminder ke Teacher untuk membuat Student Report setelah siswa menyelesaikannya |
### Material & Sub Material
Settings untuk Material (Content/Test) dan Sub Material identik.
**Group 1 — Additional**
| Setting | Keterangan |
| --- | --- |
| Count as Project | Jika dicentang, Material ini dihitung sebagai 1 project. Jika siswa sudah melewatinya, dianggap sudah mengerjakan 1 project |
| Add File Attachment | Muncul jika Count as Project dicentang. Jika dicentang, siswa diwajibkan mengunggah file project di LMS. Bisa Count as Project tanpa File Attachment jika project tidak perlu diupload |
| Add Google Form | Jika dicentang, isi Google Form URL dan Google Form Responses URL. Bisa di-set berbeda per bahasa Book |
**Group 2 — Rewards**
Rewards adalah sesuatu yang bisa didapatkan siswa setelah menyelesaikan Material atau Sub Material ini.
> Dalam praktiknya, Rewards lebih sering diisi di level **Sub Material** daripada Material.
| Setting | Keterangan |
| --- | --- |
| Get Course Skill | Jika dicentang, input Skill dan poin yang didapat siswa. Skill yang muncul sesuai Course Skill yang sudah dibuat saat membuat Course |
| Get Mastery Point | Jika dicentang, input jumlah Mastery Point yang didapat siswa |
| Get Coin | Jika dicentang, input jumlah Coin yang didapat siswa |
**Group 3 — Settings**
| Setting | Keterangan |
| --- | --- |
| Take a Picture | Jika dicentang, siswa harus mengambil foto dari kamera device-nya sebelum bisa memulai Material ini |
| Standard Time | Waktu standar (dalam detik) untuk menyelesaikan Material ini. Hanya untuk keperluan internal — tidak ditampilkan ke siswa |
| Excellent Time | Waktu yang dianggap sangat bagus (dalam detik) untuk menyelesaikan Material ini. Hanya untuk keperluan internal — tidak ditampilkan ke siswa |
## Summary & Validasi
Di tab Settings terdapat halaman **Summary** untuk melihat seluruh konfigurasi Book sekaligus tanpa perlu membuka setting satu per satu.
**Bagian atas — Reward Summary:**
| Kartu | Keterangan |
| --- | --- |
| Total MP | Total Mastery Point dari seluruh struktur Book |
| Total Coin | Total Coin dari seluruh struktur Book |
| Total Skill | Jumlah skill unik. Hover untuk melihat daftar nama skill |
| As a Project | Jumlah Material yang dicentang sebagai project |
**Bagian tengah — Content Breakdown:**
Tabel hierarki bertingkat yang menampilkan seluruh setting per struktur sekaligus. Baris bisa dibuka-tutup menggunakan tombol panah (▶/▼).
- Kolom Google Form **dinamis** — otomatis bertambah sesuai jumlah bahasa Book yang aktif
- **Angka biru** pada baris parent = hasil penjumlahan dari seluruh child-nya
- **Baris merah** = setting incomplete (dicentang tapi value kosong atau 0) — harus diperbaiki sebelum bisa Publish
**Cara membaca simbol dalam sel:**
| Simbol | Arti |
| --- | --- |
| ✓ | Setting dicentang / aktif |
| ✗ | Setting tidak dicentang |
| 0 (merah) | Setting dicentang tapi nilai belum diisi — perlu diperbaiki |
| Chip nama skill | Nama skill beserta poin dalam bentuk kapsul |
| "x skills" | Jumlah total skill pada baris parent |
> Terdapat **legend** di bawah tabel yang menjelaskan arti setiap simbol. Summary bersifat **read-only** — hanya untuk review, bukan tempat edit.
