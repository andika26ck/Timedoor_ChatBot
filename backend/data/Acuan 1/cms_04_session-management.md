---
judul: CMS Admin — Session Management
kategori: SOP
domain: CMS Admin
label: [session, session-settings, book-history, schedule, invoice, pending-product, drop, postpone, renew]
dokumen_terkait: [sysrules_01_system-rules.md, cms_03_order-product.md, cms_05_accounting-management.md]
sumber_asli: Notion — CMS Admin — SOP & User Flow > Chapter 4 — Session Management
terakhir_update: 2026-07-27
---

# CMS Admin — Session Management (Chapter 4)

## Ringkasan
Panduan admin CMS untuk mengelola session siswa: melihat informasi session, mengubah setting session, memahami status learning/session, book history, pengaturan jadwal, invoice history, pending product, dan studi kasus do's & don'ts.

---

## 4.1 Session Information
**Akses:** Menu Student → Session → See Details → tab Information

**Informasi yang tersedia:**
- **Book - Lang** — buku dan bahasa yang digunakan
- **Meeting Left** — sisa meeting pada session ini
- **Expired Date** — masa berlaku session
- **Class Type** — tipe kelas (Adaptive/Group)
- **Rent Duration** — sisa masa penggunaan Add-Ons

**Tombol aksi:**

- **Convert Meeting Left to Balance** — dipakai ketika siswa ingin mengganti package/variant. Sisa meeting dikonversi menjadi balance untuk membeli package baru. Contoh: 8 meeting sisa × Rp 100.000 = Rp 800.000 balance. Setelah convert, balance terlihat di Student Detail dan bisa diaktifkan saat order lewat fitur **Pay with Student Balance**.
- **Order Product / Order Add-Ons** — dipakai ketika siswa ingin membeli product baru atau menambah add-ons dari dalam session yang sudah ada. Gunakan Order Product (bukan Make an Order) jika hanya ingin menambah kuota atau mengganti package di session yang sama. Make an Order akan membentuk session baru sehingga dua package aktif bersamaan.
- **Drop Session** — dipakai ketika siswa tidak melanjutkan session. Admin wajib mencatat alasan drop.
- **Postpone Session** — untuk siswa yang cuti/berhenti sementara.
  - **Manual Postponed** — admin mencutikan siswa secara manual (liburan, istirahat, dll).
  - **System Postponed** — sistem otomatis men-postpone jika kuota habis dan tidak ada pembaruan dalam 30 hari.
- **Expired Date Setting** — mengatur kapan session siswa berakhir.

---

## 4.2 Session Settings
**Akses:** Menu Student → pilih siswa → Session → See Details → tab Session Settings

Yang bisa diubah:
- **Session Name** — nama sesi
- **Homeroom Teacher** — guru penanggung jawab (ditampilkan di report siswa)
- **Book** — buku yang diakses siswa (tidak bisa diganti di sini; harus order package baru)
- **Language Book** — bahasa buku yang digunakan
- **Special Price** — harga khusus untuk pembayaran ke depan
- **Notes** — catatan internal yang hanya bisa dilihat admin

---

## 4.3 Learning and Session Status

**Session Status:**

| Status | Arti |
| --- | --- |
| Idle | Terdaftar dan punya session aktif, tapi belum pernah masuk kelas sama sekali |
| Ongoing | Session aktif dan siswa sudah mulai belajar |
| Drop | Siswa berhenti dari session ini |
| Postponed | Siswa berhenti sementara (manual atau otomatis oleh sistem) |

**Learning Status** ditentukan oleh Session Status dengan hierarki: **Ongoing > Idle > Postponed > Drop**.
Contoh: jika siswa punya 1 session Ongoing dan 1 session Postponed, Learning Status yang ditampilkan adalah **Ongoing**.

Status **Not Joined** berlaku untuk siswa yang belum membeli product apapun (hanya terdaftar sebagai calon Trial Student).

---

## 4.4 Book History
**Akses:** Session Detail → tab Book History

**Status buku siswa:**

| Status | Arti |
| --- | --- |
| Idle | Buku sudah siap tapi siswa belum membayar |
| Ongoing | Buku sedang dipelajari |
| Incompleted | Buku tidak dipelajari sampai selesai dan siswa pindah buku |
| Completed | Buku sudah selesai dipelajari |

**Fitur di Learning Progress:**
- **Lock/Unlock Lesson** — admin dapat mengunci atau membuka lesson tertentu
- **Finish Course** — menyelesaikan course secara manual (learning progress menjadi 100%)
- **Generate Certificate** — tersedia setelah Finish Course
- **Upgrade Course** — opsi naik tingkat ke course berikutnya setelah Finish Course

**Tab Meeting History:** riwayat pertemuan dan pelajaran yang telah dilalui siswa.
**Tab Report:** hasil pembelajaran siswa yang dibuat Teacher. Admin bertugas mengecek dan meng-approve report. Bisa juga diakses via menu **Approval → tab Report**.

---

## 4.5 Schedule Setting
**Akses:** Session Detail → tab Schedule Setting

Informasi yang tersedia:
- **Homeroom Teacher** — wali kelas yang bertanggung jawab membuat report
- **Class & Schedule** — jadwal kelas yang diikuti siswa
- **Upcoming Class** — kelas mendatang

Fitur:
- **Add Extra Class** — menambahkan kelas tambahan siswa.
- **Edit/Replace Jadwal** — jika ada kesepakatan mengubah dari kelas utama. Jadwal yang diubah otomatis berstatus Drop.
- **Drop Jadwal** — jika siswa tidak dapat mengikuti 1 kelas di waktu tertentu, drop jadwal tersebut agar tidak muncul di LMS.

---

## 4.6 Invoice History
**Akses:** Session Detail → tab Invoice History

Menunjukkan riwayat invoice pembelian produk pada 1 session tersebut saja.

---

## 4.7 Pending Product
**Akses:** Session Detail → tab Pending Product

Menunjukkan product yang dibeli saat siswa masih memiliki meeting aktif pada product yang berbeda. Harus di-**Redeem** oleh admin sebelum bisa digunakan.

---

## 4.8 Session Study Cases — Do's & Don'ts

### Q: Siswa ingin belajar 2 materi sekaligus (misal Coding dan Matematika). Bagaimana caranya?
A: **Do's** — buat 2 Session terpisah, 1 untuk Coding dan 1 untuk Matematika.
**Don'ts** — jangan perbarui kuota siswa via Make an Order karena akan membuat Session baru yang identik. Ini menyebabkan kesalahan absensi, salah hitung Meeting Quota, dan kesalahan penagihan Invoice.

### Q: Siswa naik level (selesai course dan lanjut course berikutnya). Bagaimana caranya?
A: **Do's** — order Package baru melalui menu **Renew/Order Product from Session** (bukan Make an Order).
**Don'ts** — jangan gunakan Make an Order untuk naik level. Ini membuat Session baru sehingga ada 2 Session aktif bersamaan, menyebabkan kebingungan administrasi, sulit track meeting history, dan potensi kehilangan Lesson Progress.
