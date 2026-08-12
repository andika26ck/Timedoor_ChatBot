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
<table header-row="true">
<tr>
<td>Setting</td>
<td>Keterangan</td>
</tr>
<tr>
<td>Report Reminder</td>
<td>Jika dicentang, Lesson ini akan muncul sebagai reminder ke Teacher untuk membuat Student Report setelah siswa menyelesaikannya</td>
</tr>
</table>
### Material & Sub Material
Settings untuk Material (Content/Test) dan Sub Material identik.
**Group 1 — Additional**
<table header-row="true">
<tr>
<td>Setting</td>
<td>Keterangan</td>
</tr>
<tr>
<td>Count as Project</td>
<td>Jika dicentang, Material ini dihitung sebagai 1 project. Jika siswa sudah melewatinya, dianggap sudah mengerjakan 1 project</td>
</tr>
<tr>
<td>Add File Attachment</td>
<td>Muncul jika Count as Project dicentang. Jika dicentang, siswa diwajibkan mengunggah file project di LMS. Bisa Count as Project tanpa File Attachment jika project tidak perlu diupload</td>
</tr>
<tr>
<td>Add Google Form</td>
<td>Jika dicentang, isi Google Form URL dan Google Form Responses URL. Bisa di-set berbeda per bahasa Book</td>
</tr>
</table>
**Group 2 — Rewards**
Rewards adalah sesuatu yang bisa didapatkan siswa setelah menyelesaikan Material atau Sub Material ini.
> Dalam praktiknya, Rewards lebih sering diisi di level **Sub Material** daripada Material.
<table header-row="true">
<tr>
<td>Setting</td>
<td>Keterangan</td>
</tr>
<tr>
<td>Get Course Skill</td>
<td>Jika dicentang, input Skill dan poin yang didapat siswa. Skill yang muncul sesuai Course Skill yang sudah dibuat saat membuat Course</td>
</tr>
<tr>
<td>Get Mastery Point</td>
<td>Jika dicentang, input jumlah Mastery Point yang didapat siswa</td>
</tr>
<tr>
<td>Get Coin</td>
<td>Jika dicentang, input jumlah Coin yang didapat siswa</td>
</tr>
</table>
**Group 3 — Settings**
<table header-row="true">
<tr>
<td>Setting</td>
<td>Keterangan</td>
</tr>
<tr>
<td>Take a Picture</td>
<td>Jika dicentang, siswa harus mengambil foto dari kamera device-nya sebelum bisa memulai Material ini</td>
</tr>
<tr>
<td>Standard Time</td>
<td>Waktu standar (dalam detik) untuk menyelesaikan Material ini. Hanya untuk keperluan internal — tidak ditampilkan ke siswa</td>
</tr>
<tr>
<td>Excellent Time</td>
<td>Waktu yang dianggap sangat bagus (dalam detik) untuk menyelesaikan Material ini. Hanya untuk keperluan internal — tidak ditampilkan ke siswa</td>
</tr>
</table>
## Summary & Validasi
Di tab Settings terdapat halaman **Summary** untuk melihat seluruh konfigurasi Book sekaligus tanpa perlu membuka setting satu per satu.
**Bagian atas — Reward Summary:**
<table header-row="true">
<tr>
<td>Kartu</td>
<td>Keterangan</td>
</tr>
<tr>
<td>Total MP</td>
<td>Total Mastery Point dari seluruh struktur Book</td>
</tr>
<tr>
<td>Total Coin</td>
<td>Total Coin dari seluruh struktur Book</td>
</tr>
<tr>
<td>Total Skill</td>
<td>Jumlah skill unik. Hover untuk melihat daftar nama skill</td>
</tr>
<tr>
<td>As a Project</td>
<td>Jumlah Material yang dicentang sebagai project</td>
</tr>
</table>
**Bagian tengah — Content Breakdown:**
Tabel hierarki bertingkat yang menampilkan seluruh setting per struktur sekaligus. Baris bisa dibuka-tutup menggunakan tombol panah (▶/▼).
- Kolom Google Form **dinamis** — otomatis bertambah sesuai jumlah bahasa Book yang aktif
- **Angka biru** pada baris parent = hasil penjumlahan dari seluruh child-nya
- **Baris merah** = setting incomplete (dicentang tapi value kosong atau 0) — harus diperbaiki sebelum bisa Publish
**Cara membaca simbol dalam sel:**
<table header-row="true">
<tr>
<td>Simbol</td>
<td>Arti</td>
</tr>
<tr>
<td>✓</td>
<td>Setting dicentang / aktif</td>
</tr>
<tr>
<td>✗</td>
<td>Setting tidak dicentang</td>
</tr>
<tr>
<td>0 (merah)</td>
<td>Setting dicentang tapi nilai belum diisi — perlu diperbaiki</td>
</tr>
<tr>
<td>Chip nama skill</td>
<td>Nama skill beserta poin dalam bentuk kapsul</td>
</tr>
<tr>
<td>"x skills"</td>
<td>Jumlah total skill pada baris parent</td>
</tr>
</table>
> Terdapat **legend** di bawah tabel yang menjelaskan arti setiap simbol. Summary bersifat **read-only** — hanya untuk review, bukan tempat edit.
