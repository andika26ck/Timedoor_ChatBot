---
Kategori: SOP
Domain: CMS Admin
Topik: upcoming contract, renew, combine invoice, paylater
Ringkasan: Panduan pengelolaan keuangan meliputi upcoming contract, combine invoice, paylater, dan aturan pembuatan diskon.
---

## Chapter 5 - Accounting Management (Contract, Invoice, Paylater, Discount, Approval)

### Ringkasan

Sisi keuangan dan persetujuan: memantau session yang akan habis lewat Upcoming Contract dan cara Renew, menggabungkan tagihan dengan Combine Invoice, mengelola Paylater, membuat tiga tipe Discount (General, Referral, Siblings) beserta aturan mainnya, serta approval absensi dan report.

---

### Upcoming Contract

Upcoming Contract adalah **list siswa yang session-nya sudah mau habis** (sisa 2 meeting, 1 minggu lagi expired, dan sebagainya). Tab ini menjadi reminder untuk admin agar session siswa segera diperbarui/Renew.

#### Informasi pada halaman detail

- Lesson ID siswa, Nama Siswa, Nama Parent
- Sisa Kuota, Tipe kelas, dan Buku
- **Internal note** — catatan untuk dibaca oleh admin saja
- **Invoice note** — catatan yang ditampilkan pada invoice
- Riwayat invoice/pembelian yang sudah dilakukan siswa
- Riwayat pertemuan dan pembelajaran siswa
- Produk yang dimiliki siswa saat ini

#### Alur Renew

1. Klik **Renew** pada siswa yang bersangkutan.
2. Sistem mengarahkan ke halaman Product Information seperti Make an Order, tapi **spesifik ke session yang ingin diperbarui**.
3. Isi kembali kolom yang diperlukan: quantity, class type, invoice note, Schedule, dan Class.
4. Halaman berikutnya menyajikan ringkasan transaksi. Jika sudah cocok, lanjut ke **Generate Invoice**.

#### Kasus khusus

**Q: Bagaimana jika siswa ingin renew product yang lain?**
A: Admin dapat mengakses session lain dengan mengganti item yang sedang diperbarui menggunakan fitur **Change Item**.

**Q: Bagaimana cara melakukan Renew untuk Siblings?**
A: Gunakan fitur **Add Siblings**, lalu pilih saudara dari siswa tersebut. Halaman Product Information untuk saudara tersebut dapat diakses dengan mengklik namanya. Proses pengisiannya tetap sama seperti sebelumnya.

---

### Combining Invoice

**Jalur menu:** Accounting → Invoice → Tab Combined Invoice → Create Combine Invoice

Combined Invoice digunakan untuk memudahkan penagihan kepada customer yang memiliki **lebih dari 1 anak atau lebih dari satu invoice**.

> **Aturan utama:** Combine Invoice hanya bisa dilakukan pada **1 Parents yang sama**.

Penggunaan umumnya untuk menggabungkan 2 invoice berbeda, misalnya jika student membeli 2 package berbeda (EN dan Coding). Hal ini akan membuat 2 Invoice, karena dalam 1 Session hanya bisa ada 1 Package.

#### Langkah

1. Pilih invoice dengan nama orang tua yang sama, lalu klik **Preview**.
2. Halaman preview menampilkan hasil penggabungan.
3. Jika sudah sesuai, klik **Create Combine Invoice**.
4. Combined Invoice muncul di list dan dapat dikirim ke customer. Setelah dibayar, jangan lupa **Set to Paid**.

---

### Paylater

**Jalur menu:** Accounting → Paylater

Pada halaman Paylater, Admin dapat melihat customer yang memilih pembayaran jenis Paylater dan berapa tagihan yang belum terbayar.

#### Kolom pada List Paylater

| Kolom | Keterangan |
| --- | --- |
| **Student** | Nama siswa |
| **Parent** | Nama orang tua dari siswa |
| **Installment** | Berapa kali penagihan untuk customer tersebut |
| **Issued Date** | Kapan invoice masuk ke sistem |
| **Remaining Payment** | Jumlah uang yang belum dibayar; jika sudah lunas tertulis "Paid Off" |
| **Action Button (Detail)** | Melihat isi invoice secara lebih rinci |

#### Halaman Detail

Menampilkan informasi Customer, Total Transaksi (Total Billed), Jumlah Penagihan (Invoice/Installment), yang sudah dibayar (Paid), dan sisa yang belum dibayar (Remaining). Di bagian bawah admin dapat mencari dan melihat kapan invoice dibuat, berapa jumlah yang dibayar, dan status pembayaran.

#### Create Invoice pada Paylater

Digunakan ketika customer akan membayar sisa tagihan dari total tagihan Paylater. Saat customer sudah membayar, Admin menggunakan action button lalu klik **Set To Paid** — langkah yang sama seperti pembayaran invoice pada Make an Order. Setelah di-Save, status invoice berubah menjadi **Paid**.

---

### Discount

**Jalur menu:** Accounting → Discount → Create Discount

Pada halaman ini Admin dapat membuat diskon yang nantinya digunakan saat pembelian produk, melihat detail diskon, mengedit variant/judul/tipe diskon, dan menghapus diskon yang tidak relevan.

#### Kolom saat Create Discount

| Kolom | Keterangan |
| --- | --- |
| **Discount Name** | Nama diskon |
| **Type Of Discount** | Jenis diskon: General, Referral, atau Siblings |
| **Branch** | Pembuatan diskon untuk branch mana |

Setelah diisi, klik **Active** lalu **Save**.

#### Menambah variant diskon

**Jalur:** Detail → Variant → Add Discount Variant

Admin mengisi Discount name, Currency, amount, dan note, lalu Save.

> **Penting:** apabila ingin menambah variant diskon baru, admin **tidak** membuat Create Discount lagi. Masuk ke wadah diskon yang sudah dibuat, buka tab Variant, lalu **Add Discount Variant**.

#### Referred vs Referral Discount

| Istilah | Dipakai oleh |
| --- | --- |
| **Referred Discount** | Siswa yang **diajak** |
| **Referral Discount** | Siswa yang **mengajak** |

Contoh: Siswa A (Freya Odinson) ingin mendaftar karena diajak temannya, Siswa B (Thor Odinson). Sebelum generate invoice, Admin dapat menggunakan Referred Discount pada Siswa A.

#### Aturan Referred Discount

1. Pastikan status siswa yang mengajak **masih aktif** (Ongoing, Idle, atau Postponed). Apabila sudah **Drop**, maka Referred Discount tidak bisa digunakan kepada siswa yang diajak.
2. Saat siswa membeli package, Admin wajib **menginputkan nama Student yang mengajak**, bisa menggunakan nama student atau **kode referral** (di-generate otomatis oleh sistem, dapat dilihat pada Student Details). Apabila dalam satu transaksi terdapat banyak siswa, Admin dapat menentukan apakah yang mendapat diskon hanya salah satu atau semuanya.
3. Referred Discount hanya bisa digunakan **sekali**, karena hanya berlaku saat pertama kali mendaftar.

#### Aturan Referral Discount

Referral Discount merupakan feedback yang diberikan kepada siswa yang berhasil mengajak temannya mendaftar. Dapat digunakan dengan dua cara:

1. Sebagai **potongan harga** saat proses pembelian package.
2. Sebagai **cashback** yang dikirim langsung ke orang tua siswa.

#### Aturan Sibling Discount

Yang membedakan Sibling Discount adalah **amount diatur Per Person**, sehingga saat pembuatan invoice diskon menyesuaikan berapa bersaudara siswa tersebut, memberikan potongan untuk masing-masing siswa.

Hal yang perlu diperhatikan Admin:

1. Jika jumlah anak ≥ 2 dan admin **belum memilih variantnya**, sistem menampilkan warning.
2. Jika hanya satu anak yang terdaftar karena anak pertama sudah lebih dulu didaftarkan, diskon **tetap dapat diterapkan tanpa notifikasi error**, karena sistem mengenali bahwa keduanya memiliki orang tua yang sama.
3. Jika admin sudah menerapkan diskon Sibling, kemudian kembali ke halaman sebelumnya dan **mengurangi jumlah anak**, maka diskon Sibling masih aktif dan sistem akan menampilkan konfirmasi.

---

### Approve Attendance

Halaman Approval Attendance digunakan Admin untuk meninjau dan menyetujui absensi yang telah dibuat Teacher. Detail tanggung jawab dan dampak jika absensi tidak di-approve dibahas di Chapter 3 (Check Todays Attendance).

---

### Approve Report

Pada halaman ini Admin dapat melihat hasil Report yang telah dibuat oleh Teacher.

- Admin dapat **Edit Report** apabila terdapat kesalahan dalam penyusunan Report siswa.
- Admin dapat melihat report sebelum di-download dengan fitur **Preview Report**.
- Setelah pengecekan, Admin dapat **Approve** Report tersebut.
- Report yang sudah di-Approve dapat diberikan ke orang tua siswa untuk pembuatan keputusan selanjutnya.

---

### Latihan (Challenge) Chapter 5

- **Challenge 10a** — Buat order baru dengan jumlah 1 meeting saja agar muncul di Upcoming Contract, lalu coba renew order tersebut.
- **Challenge 10b** — Buat order Siblings dengan jumlah 1 meeting saja agar muncul di Upcoming Contract, lalu coba renew invoice sibling tersebut.