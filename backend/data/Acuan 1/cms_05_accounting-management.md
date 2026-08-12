---
judul: CMS Admin - Chapter 5 Accounting Management
kategori: SOP
domain: CMS Admin
label: [invoice, pembayaran, paylater, akuntansi, refund]
sumber_asli: Notion - Academy LMS - Knowledge Base > CMS Admin - Chapter 5 Accounting Management
terakhir_update: 2026-07-28
---

# CMS Admin - Chapter 5 Accounting Management

## Ringkasan
3. Halaman Product Information terbuka untuk session yang akan habis

---

## 5.1 Upcoming Contract
**Tujuan:** Reminder siswa yang sessionnya hampir habis (sisa 2 meeting, 1 minggu lagi expired, dll).
**Akses:** Menu **Accounting** → **Upcoming Contract**
**Langkah Renew:**
1. Cari nama siswa di list
2. Klik **Renew**
3. Halaman Product Information terbuka untuk session yang akan habis
4. Isi kolom: Quantity, Class Type, Invoice Note, Schedule dan Class
5. Cek ringkasan transaksi
6. Klik **Generate Invoice**
**Renew Product yang Berbeda:** Gunakan **Change Item** untuk mengganti item yang sedang diperbaharui.
**Renew untuk Siblings:** Gunakan fitur **Add Siblings** untuk menambahkan saudara siswa, lalu klik nama saudara tersebut untuk mengakses halaman Product Information-nya.
---
## 5.2 Combine Invoice
**Tujuan:** Menggabungkan lebih dari 1 invoice ke 1 parent yang sama untuk memudahkan penagihan.
**Akses:** Menu **Accounting** → **Invoice** → tab **Combined Invoice** → **Create Combine Invoice**
**Catatan:** Combine Invoice hanya bisa dilakukan untuk invoice dengan parent yang sama.
**Langkah:**
1. Pilih invoice-invoice dari orang tua yang sama
2. Klik **Preview** untuk melihat hasil gabungan
3. Jika sudah sesuai, klik **Create Combine Invoice**
4. Combined Invoice muncul di list dan siap dikirim ke customer
5. Setelah customer bayar, klik **Set to Paid**
---
## 5.3 Paylater
**Tujuan:** Memungkinkan siswa mengikuti kelas sebelum membayar penuh.
**Akses:** Menu **Accounting** → **Paylater**
**Cara Paid Invoice dengan Paylater:**
1. Buka menu **Accounting** → **Invoice** → tab **Invoice/Payment**
2. Pilih invoice siswa
3. Klik **Action** → **Set to Paid** → pilih opsi **Paylater**
4. Siswa langsung bisa diabsen dan diberikan kunci kelas
**Informasi di halaman Paylater:**
- **Student** — nama siswa
- **Parent** — nama orang tua
- **Installment** — berapa kali penagihan untuk customer tersebut
- **Issued Date** — kapan invoice masuk ke sistem
- **Remaining Payment** — jumlah yang belum dibayar (jika sudah lunas: "Paid Off")
**Cara Menagih Pembayaran Paylater (Create Invoice):**
1. Buka menu **Accounting** → **Paylater**
2. Klik **Detail** pada nama siswa
3. Lihat ringkasan: Total Billed, Jumlah Installment, Paid, dan Remaining
4. Klik **Create Invoice** untuk membuat tagihan cicilan
5. Masukkan nominal yang akan dibayarkan
6. Invoice baru terbuat — bisa di-paid menggunakan bank transfer atau cash
7. Klik **Set to Paid** setelah customer membayar
> Pantau tagihan paylater secara rutin di menu **Accounting** → **Paylater**.
---
## 5.4 Discount
**Akses:** Menu **Accounting** → **Discount** → **Create Discount**
**3 Tipe Discount:**
**General Discount**
Diskon umum yang bisa digunakan saat pembelian produk.
Cara buat: Create Discount → tipe General → Save → buka Detail → tab Variant → Add Discount Variant → isi nama, currency, amount, note → Save.
**Referral Discount**
- **Referred Discount** — untuk siswa yang diajak (siswa baru). Hanya bisa digunakan 1x saat pertama kali mendaftar.
- **Referral Discount** — untuk siswa yang mengajak (reward). Bisa digunakan sebagai potongan harga saat order, atau dicairkan sebagai cashback.
Aturan Referred Discount:
1. Pastikan status siswa yang mengajak masih aktif (Ongoing, Idle, atau Postponed). Jika sudah Drop, discount tidak bisa digunakan.
2. Input nama student yang mengajak atau kode referral (auto-generated, bisa dilihat di Student Details).
3. Hanya berlaku 1x (saat pertama kali mendaftar).
**Siblings Discount**
Diskon untuk siswa yang memiliki saudara yang juga les. Harga sudah ditetapkan per person.
Aturan Siblings Discount:
1. Jika jumlah anak ≥ 2 dan variant belum dipilih, sistem menampilkan warning.
2. Jika hanya 1 anak yang terdaftar (anak pertama sudah lebih dulu didaftarkan), diskon tetap bisa diterapkan karena sistem mengenali orang tua yang sama.
3. Jika admin sudah terapkan diskon Siblings lalu kembali dan mengurangi jumlah anak, sistem akan menampilkan konfirmasi.
---
## 5.5 Approve Attendance
**Akses:** Menu **Approval** → tab **Attendance**
Admin meng-approve absensi yang sudah dibuat oleh Teacher. Setelah di-approve, kuota meeting siswa akan berkurang.
---
## 5.6 Approve Report
**Akses:** Menu **Approval** → tab **Report**
**Langkah:**
1. Cari report yang perlu di-approve
2. Klik **Preview Report** untuk mengecek keseluruhan isi report
3. Cek kesesuaian: nama siswa, nama teacher, kelas, materi, dll
4. Jika sudah benar → klik **Approve**
5. Jika ada yang perlu diperbaiki → klik **Edit Report** atau informasikan ke teacher untuk revisi
> Report yang sudah di-approve dapat diberikan ke orang tua sebagai bahan pengambilan keputusan selanjutnya.
