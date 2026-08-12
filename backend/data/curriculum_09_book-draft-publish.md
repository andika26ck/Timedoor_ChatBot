---
judul: Curriculum Maker - Book, Draft & Publish, Activity Logs
kategori: SOP
domain: Curriculum Maker
label: [book, draft, publish, activity-logs, published-logs, versioning, multiple-language]
sumber_asli: Notion - Academy LMS - Knowledge Base > Curriculum Maker - Book, Draft & Publish, Activity Logs
terakhir_update: 2026-07-28
---

# Curriculum Maker - Book, Draft & Publish, Activity Logs

## Ringkasan
Book adalah versi spesifik dari sebuah Course yang benar-benar dipelajari siswa di LMS. Satu Course bisa memiliki beberapa Book dengan format delivery berbeda.

---

<page url="https://app.notion.com/p/3aaf3fd8fafa8050a7fef918bfb87ec1">📐 Konsep Struktur Data</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa809196c5faac200f29d4">📁 1. Subject</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa807ca4d9ed2ff4f746cf">📚 2. Course</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa807d81cfc7fbfab3c986">📦 3. Package</page>
## Membuat Book
Book adalah versi spesifik dari sebuah Course yang benar-benar dipelajari siswa di LMS. Satu Course bisa memiliki beberapa Book dengan format delivery berbeda.
Book dibuat secara **independent** — tidak dibuat dari dalam Course.
Saat membuat Book, isi:
| Field | Keterangan |
| --- | --- |
| Nama Book | Nama Book yang akan ditampilkan |
| Deskripsi | Deskripsi singkat Book |
| Subject | Subject yang sesuai |
| Course | Course yang menjadi induk Book ini |
| Meeting Type | Offline atau Online |
## Tab pada Halaman Book
Setelah Book dibuat, semua pengelolaan dilakukan melalui tab berikut:
| Tab | Fungsi |
| --- | --- |
| Details | Informasi umum Book (yang diisi saat create) |
| Book Content | Menambah dan mengedit struktur Book (Sub Level, Lesson, Material). Menambah bahasa Book juga dilakukan di sini |
| Settings | Mengatur konfigurasi behavior per struktur (Rewards, Additional, dll) |
| Activity Logs | Riwayat perubahan Draft Book |
| Published Logs | Riwayat Publish Book beserta versioning |
## Multiple Language
Satu Book bisa terdiri dari beberapa bahasa. Penambahan bahasa dilakukan di tab **Book Content**.
Aturan penting terkait language:
- Nama struktur (Sub Level, Lesson, Material) **bisa berbeda** per bahasa
- Isi konten Material (WYSIWYG, link, dll) **bisa berbeda** per bahasa
- Jumlah dan hierarki struktur **harus sama persis** di semua bahasa — tidak bisa berbeda
- Semua Book Settings berlaku untuk semua bahasa (**language-agnostic**), **kecuali** Google Form URL dan Responses URL yang bisa di-set berbeda per bahasa
## Draft & Publish
Semua perubahan pada Book — baik di Book Content maupun Settings — **otomatis tersimpan sebagai Draft**. Perubahan belum ter-apply ke LMS siswa sampai di-Publish.
**Cara Publish:**
1. Pastikan semua settings sudah benar — cek tab **Settings → Summary** untuk validasi
2. Jika ada setting yang incomplete (dicentang tapi value kosong atau 0), akan muncul **tanda merah** di Summary dan sistem akan **memblokir Publish**
3. Jika semua sudah valid, klik **Publish**
4. Isi **versi dan catatan perubahan** (seperti git commit message)
5. Semua perubahan dalam Draft langsung ter-apply ke LMS siswa
> Publish selalu mencakup **keseluruhan Book** — tidak bisa publish sebagian struktur saja.
## Activity Logs
Mencatat seluruh perubahan yang dilakukan pada Book selama dalam status Draft.
**Kolom tabel:**
| Kolom | Keterangan |
| --- | --- |
| User | Nama pengguna yang melakukan perubahan beserta tanggal dan waktu |
| Topic & Chapter | Ditampilkan dalam 2 baris: nama Chapter (bold) di atas, nama sub-struktur di bawahnya |
| Changes | Detail perubahan yang dilakukan. Contoh: "Gains has been changed", "Title updated from X to Y", "Content has been changed" |
| Action Type | Tipe aksi dalam bentuk chip berwarna. Contoh: UPDATE SETTING, UPDATE |
| Version | Draft jika belum di-publish. Nomor versi (contoh: v1.0) jika sudah di-publish. Saat Publish, semua Draft otomatis terkunci ke nomor versi tersebut dan tidak berubah pada Publish berikutnya |
| Actions | Tombol mata (👁️) untuk melihat detail log perubahan tersebut |
**Pencarian & Filter:**
| Fitur | Keterangan |
| --- | --- |
| Date Range | Saring aktivitas berdasarkan rentang tanggal |
| Status dropdown | Filter berdasarkan tipe aksi. Opsi: All Status (default), Create, Update, Reorder, Delete, Publish, Update Setting |
| Searchbar | Cari berdasarkan Nama User, Nama Chapter, atau Nama Topic |
| Reset Filter | Tombol untuk mereset semua filter sekaligus |
## Published Logs
Menunjukkan daftar seluruh riwayat Publish Book. Setiap entri menampilkan:
- **Nama versi** — diisi saat Publish (contoh: "init")
- **Siapa yang publish** dan **kapan** (contoh: "System release this at 31 May 2026 18:28")
- **Catatan perubahan** — pesan yang diisi saat Publish (contoh: "Initial release")
- **Badge Latest Version** — menandakan versi yang sedang aktif di LMS siswa
**Tombol aksi per entri:**
| Tombol | Fungsi |
| --- | --- |
| Preview | Melihat tampilan Book pada versi Publish tersebut |
| Detail Activity | Membuka modal Book Version — menampilkan daftar seluruh Draft yang tercakup dalam Publish ini, beserta detail perubahannya (user, tanggal, apa yang diubah). Setiap Draft juga bisa di-Preview secara individual. Jika datanya banyak, ada tombol Load More untuk memuat lebih banyak entri |
<page url="https://app.notion.com/p/3aaf3fd8fafa8076a52feb620826f412">🗂️ 4. Book Content</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa809f86aef37f0b13271b">⚙️ 5. Book Settings</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa808d860ad5601b8ac871">🧪 6. Master Data Test</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa80fca332e8125c610069">🗺️ 7. Learning Path</page>
<page url="https://app.notion.com/p/3aaf3fd8fafa804b8c3bca50fcd10c9d">❓ 8. Question Bank</page>
