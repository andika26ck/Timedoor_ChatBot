---
judul: Chapter 4 - Session Management (Session Info, Status, Book History, Schedule)
kategori: SOP
domain: CMS Admin
label: [session information, session settings, learning status, book history, schedule setting, invoice history, study case, troubleshooting]
sumber_asli: Figma - [ID] Branch Admin_System Guidelines, slide 139-182
terakhir_update: 2026-07-28
---

# Chapter 4 - Session Management (Session Info, Status, Book History, Schedule)

## Ringkasan

Pengelolaan session siswa yang sudah berjalan: isi tab Session Information beserta fitur Convert Balance, Drop, dan Postpone; Session Settings; hierarki Learning Status dan Session Status; Book History dan sertifikat; Schedule Setting untuk kelas tambahan/pengganti; Invoice History; Pending Product; serta studi kasus Do's and Don'ts.

---

## Session Information

Halaman ini dapat diakses melalui menu **Student Session**, mencakup Product Information, Add Ons, Schedule & Student Availability, dan tab Student.

### Informasi yang ditampilkan

| Field | Keterangan |
| --- | --- |
| **Book - Lang** | Buku dan bahasa yang digunakan |
| **Meeting Left** | Sisa meeting yang tersedia pada session ini |
| **Expired Date** | Masa berlaku session |
| **Class Type** | Tipe kelas |
| **Rent Duration** | Sisa masa penggunaan Add-Ons |

Pada bagian Schedule & Class, admin dapat mengedit tipe kelas siswa, mengatur waktu ketersediaan siswa, dan mengatur jadwal kelas siswa.

### Convert Meeting Left To Balance

Fitur ini digunakan ketika siswa ingin **mengganti package/variant** sehingga terjadi perubahan pada session yang sudah terbentuk. Sisa meeting diuangkan menjadi balance yang dapat digunakan saat membeli package baru.

Contoh perhitungan: package seharga Rp100.000 dengan 8 sisa meeting → 8 × Rp100.000 = **Rp800.000** balance.

Setelah convert, balance dapat dilihat di Student Detail dan digunakan saat order package dengan mengaktifkan **Pay with Student Balance**.

### Order Product dan Order Add Ons

Digunakan ketika siswa ingin membeli product baru atau menambah add-ons. Tombol ini mengarahkan ke halaman Product Information.

**Q: Kapan menggunakan Order Product dari dalam Session?**
A: Ketika siswa ingin menambah kuota dan ketika siswa ingin mengganti package.

**Q: Kenapa tidak lewat Make an Order?**
A: Karena jika menggunakan Make an Order untuk menambah kuota atau mengganti package, session siswa akan bertambah, sehingga package sebelumnya dan yang baru akan **aktif bersamaan**.

### Drop Session

Digunakan ketika siswa tidak ingin melanjutkan session dan ingin berhenti. Tugas Admin adalah mengetahui alasan siswa berhenti dan menonaktifkan siswa tersebut.

### Postpone Session

Mirip Drop Session, tetapi untuk siswa yang ingin cuti/berhenti **sementara**. Terbagi 2:

| Jenis | Keterangan |
| --- | --- |
| **Manual Postponed** | Admin secara manual mencutikan siswa dengan alasan tertentu (liburan, istirahat, dan lain-lain) |
| **System Postponed** | Sistem mendeteksi ketika kuota siswa habis dan tidak diperbarui dalam waktu **30 hari (1 bulan)**, maka session siswa diberhentikan sementara |

**Expired Date Setting** mengatur kapan session siswa berakhir (expired).

---

## Session Settings

**Jalur:** List Student → pilih siswa → pilih Session → See Details → tab Session Settings

### General Information yang dapat diedit

| Field | Keterangan |
| --- | --- |
| **Session Name** | Nama sesi yang diikuti siswa |
| **Homeroom Teacher** | Guru yang bertanggung jawab; akan ditampilkan pada report siswa |
| **Book** | Buku yang dapat diakses/digunakan siswa untuk belajar |
| **Language Book** | Bahasa buku yang digunakan |

> **Reminder:** Admin **tidak bisa mengganti buku** dari halaman ini. Apabila ingin mengganti buku, maka harus **order package**.

Admin juga dapat memberikan **Special Price** untuk customer yang dapat diterapkan di pembayaran ke depannya, serta menambahkan **Notes** yang hanya dapat dilihat oleh admin.

---

## Learning and Session Status

### Session Status

| Status | Arti |
| --- | --- |
| **Idle** | Siswa resmi terdaftar dan sudah memiliki Session Active (siap menggunakan LMS) tapi belum memulai kegiatan belajar (belum masuk kelas sama sekali / belum pernah absen) |
| **Ongoing** | Session sudah Active dan siswa sudah mulai belajar (Learning Progress sudah jalan) |
| **Drop** | Siswa ingin berhenti dari Session tersebut, tidak lagi melanjutkan pembelajaran maupun pembayaran pada Session ini |
| **Postponed** | Siswa ingin berhenti sementara. Dapat diberhentikan manual oleh Admin (jika ada request dari Parents) atau otomatis oleh System (jika siswa tidak memiliki Meeting Quota dan tidak ada pembelian Meeting Quota pada session ini) |

### Learning Status

Setiap Status Session yang dimiliki siswa menentukan Learning Status siswa. Ada satu status tambahan:

| Status | Arti |
| --- | --- |
| **Not Joined** | Siswa resmi terdaftar sebagai calon Trial Student saja, belum membeli Product apa pun (tidak memiliki Session Active) |

### Hierarki jika siswa punya banyak session dengan status berbeda

**Q: Bagaimana jika siswa memiliki banyak session dengan status yang berbeda-beda?**
A: Status yang ditampilkan pada kolom Learning Status mengikuti hierarki berikut (dari prioritas tertinggi):

> **Ongoing → Idle → Postponed → Drop**

Contoh penerapan:

| Siswa | Session Status yang dimiliki | Learning Status yang ditampilkan |
| --- | --- | --- |
| Siswa 1 | Ongoing, Postponed, Postponed | **Ongoing** |
| Siswa 2 | Idle, Drop, Postponed | **Idle** |
| Siswa 3 | Postponed, Postponed, Drop, Drop | **Postponed** |

---

## Book History

Tab ini mencakup Learning Progress, Meeting History, dan Report siswa. Dapat diakses juga melalui Student Session.

### Arti status buku siswa

| Status | Kondisi |
| --- | --- |
| **Idle** | Buku sudah siap, tapi siswa belum membayar |
| **Ongoing** | Buku sedang digunakan/dipelajari |
| **Incompleted** | Buku tidak dipelajari sampai selesai dan siswa pindah buku |
| **Completed** | Buku sudah selesai dipelajari |

### Learning Progress

- Admin dapat **mengunci (Lock)** atau **membuka (Unlock)** lesson yang sedang dipelajari siswa.
- Admin dapat menyelesaikan sesi/course dengan **Finish Course**, artinya Learning Progress siswa telah mencapai 100%. Admin juga dapat finish course dengan alasan lain.
- Apabila siswa telah Finish Course, Admin dapat **Generate Certificate**. Siswa kemudian memiliki opsi untuk naik tingkat (Upgrade Course) atau berhenti.

### Meeting History dan Report

- **Tab Meeting History** — riwayat pertemuan dan pelajaran yang telah dilalui siswa.
- **Tab Report** — hasil pembelajaran siswa yang dibuat oleh Teacher. Tugas admin adalah **mengecek dan meng-approve** report tersebut. Report yang perlu di-approve juga dapat dicek lewat **Menu → Approval → Tab Report**.

---

## Schedule Setting

Tab ini muncul setelah siswa sudah membayar dan admin sudah men-generate Schedule.

### Informasi pada halaman

- **Homeroom Teacher** — seperti wali kelas, bertanggung jawab membuat Report siswa
- **Class & Schedule** — jadwal kelas yang diikuti siswa
- **Upcoming Class** — kelas mendatang

### Tiga skenario perubahan jadwal

| Skenario | Aksi |
| --- | --- |
| Siswa memerlukan **kelas tambahan** | Gunakan fitur **Add Extra Class** |
| Ada kesepakatan Customer dan Admin untuk **mengubah kelas utama** | Edit jadwalnya. Jadwal yang telah diubah membuat jadwal sebelumnya otomatis berstatus **Drop** |
| Siswa **tidak dapat mengikuti** 1 kelas di minggu depan | **Drop** kelasnya, sehingga tidak muncul jadwalnya di LMS |

---

## Invoice History

Menampilkan invoice pembelian produk.

> **Catatan:** Invoice History yang tampil di sini hanya invoice yang ada pada **1 Session saja**.

---

## Pending Product

Menampilkan Product yang dibeli dengan keadaan siswa masih memiliki meeting aktif pada product yang berbeda. Proses Redeem-nya dibahas di Chapter 3.

---

## Session Study Case (Do's and Don'ts)

### Q: Siswa ingin belajar Coding dan Matematika di waktu bersamaan. Bagaimana cara membuat session-nya?
A: Buatkan **2 session terpisah**, satu untuk Coding dan satu untuk Matematika. Contoh untuk Boodie:

- Session 1 — Coding Xplorer (ACTIVE), Book: Coding Xplorer 1 6 - EN, Class: Asgard, Friday 12.00–13.00
- Session 2 — Mathematics (ACTIVE), Book: Mathematics - Navigator - ID, Class: Helheim, Thursday 12.00–13.00

**Jangan** membuat 2 session dengan **book, teacher, class, dan schedule yang sama persis**. Kesalahan ini sering terjadi ketika admin sebenarnya hanya ingin memperbarui session atau menambah kuota siswa.

### Q: Kenapa membuat 2 session dengan book, teacher, class, dan schedule yang sama persis itu salah?
A: Karena admin jadi membuat Session baru. Akibatnya bisa terjadi kesalahan absensi, kesalahan jumlah Meeting Quota (kuota tersebar ke 2 session), hingga kesalahan penagihan Invoice.

### Q: Siswa sudah menyelesaikan course dan mau naik level. Package baru dipesan dari menu mana?
A: Pesan Package baru lewat menu **Renew / Order Product from Session**, **bukan** dari Make An Order. Contoh Boodie yang sudah menyelesaikan Code and Design with Roblox:

- Session 1 — Code and Design with Roblox menjadi **INACTIVE**, Book Status: Completed
- Session 1 — Interactive Mechanics on Roblox **ACTIVE**, Book Status: Ongoing

### Q: Apa dampaknya kalau Package baru dipesan lewat Make an Order?
A: Admin jadi membuat Session baru, sehingga Session 1 (Completed) dan Session 2 (Ongoing) sama-sama berstatus ACTIVE. Dampaknya: kebingungan administrasi, sulit melacak meeting history siswa, hingga kehilangan Lesson Progress dan Learning Objective tidak tersimpan karena salah absensi.
