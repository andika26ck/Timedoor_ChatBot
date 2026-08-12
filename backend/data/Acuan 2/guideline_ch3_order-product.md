---
judul: Chapter 3 - Order Product (Product, Session, Invoice, Schedule, Attendance)
kategori: SOP
domain: CMS Admin
label: [package, add-ons, item, session, invoice, payment link, redeem, generate schedule, attendance]
sumber_asli: Figma - [ID] Branch Admin_System Guidelines, slide 79-138
terakhir_update: 2026-07-28
---

# Chapter 3 - Order Product (Product, Session, Invoice, Schedule, Attendance)

## Ringkasan

Alur penjualan dari sisi admin: perbedaan Package/Add-Ons/Item dan cara set harga variant, konsep Session serta alur pembuatannya, pengiriman payment link dan pembayaran manual, kasus Pending Product & Redeem, Generate Schedule, hingga approval absensi harian.

---

## Product & Pricing

**Jalur menu:** Product → Package → Action Button → Detail → Tab Variant → Edit Variant

### Tiga jenis product

| Jenis | Definisi | Contoh |
| --- | --- | --- |
| **Package** | Produk kursus utama yang akan diikuti siswa | Kelas coding reguler |
| **Add-Ons** | Produk tambahan yang bersifat opsional, memberikan fasilitas atau layanan tambahan untuk Session yang sudah ada. Memiliki kuota seperti Meeting Quota | Sewa Laptop, Sewa Kit IoT |
| **Item** | Produk independen, tidak terikat dengan Session. Membeli Item **tidak membuat Session baru**. Dikirim langsung ke siswa, fisik maupun digital | Paket Kelas, Paket IoT, Merchandise (tumbler, kaos) |

### Aturan set harga variant

> Saat Branch sudah Request Package, Admin **harus set harga Variant** untuk setiap Package.

**Q: Apa yang terjadi kalau harga variant belum di-set?**
A: Package akan muncul di halaman Product Information dalam keadaan tidak lengkap, sehingga **package tidak bisa dibeli maupun digunakan**.

Harga yang dimasukkan adalah **harga per meeting/pertemuan**. Hal yang sama juga harus dilakukan untuk Add-Ons dan Item.

### Pengurangan kuota Add-Ons

Saat membuat Session, Admin akan melewati kolom Add-Ons; di situlah Add-Ons diinput beserta kuotanya. Pengurangan kuota Add-Ons dilakukan **bersamaan dengan pengurangan kuota meeting** — setiap siswa diabsen, jika siswa menggunakan Add-Ons pada pertemuan itu, kuota Add-Ons ikut berkurang.

### Ketersediaan product antar branch

Package, Add-Ons, dan Items dibuat **seragam untuk semua Branch**. Jika ada yang belum tersedia di suatu Branch, bisa request ke Branch Manager masing-masing untuk di-assign-kan.

---

## Create Session

### Apa itu Session

Session adalah fitur yang memungkinkan **1 siswa mengikuti lebih dari 1 kelas (course) dalam waktu bersamaan** — bukan kasus siswa ganti course atau naik level.

| Sistem lama | Sistem baru |
| --- | --- |
| Jika siswa ingin ikut les coding Python (Kamis) dan matematika (Senin), admin harus membuat **akun berbeda** untuk siswa yang sama, karena sistem lama tidak memungkinkan 1 siswa join 2 class berbeda dalam satu waktu | Admin dapat meng-assign 1 student di 2 learning session, sehingga siswa dapat belajar di lebih dari 1 class (course) dalam satu waktu |

### Alur order product siswa

1. Siswa join trial → Admin melakukan register + assign trial → siswa memiliki 1 learning session untuk trial.
2. Apakah siswa mau lanjut les? Jika ya, Admin melakukan 1st order (**New Session**).
3. Selanjutnya ada dua percabangan yang sering tertukar:

| No | Kondisi | Aksi | Efek |
| --- | --- | --- | --- |
| 1 | Siswa mau **mengganti** product | Order di dalam session yang sudah ada | **Tidak** membuat learning session baru |
| 2 | Siswa mau **menambah** product aktif | Order (New Session) | **Membuat** learning session baru, karena session sebelumnya masih ingin diaktifkan |

### Tiga kondisi siswa saat Make an Order

**Jalur menu:** Invoice List → Make an Order → pilih siswa

Tampilan setelah klik Make An Order berbeda tergantung kondisi siswa:

**Kondisi 1 — Siswa baru join, belum pernah memiliki session**

- Hanya muncul opsi **Order New Product**, pilih package yang akan diorder.
- Tampilan yang sama juga muncul ketika session siswa sudah **Drop**, karena session Drop tidak dapat dipulihkan kecuali membuat Session baru melalui order.

**Kondisi 2 — Siswa sudah memiliki session**

Muncul 3 opsi (juga muncul saat session anak berstatus Idle, Ongoing, dan Postponed):

| Opsi | Kapan dipakai |
| --- | --- |
| **Renew Learning Session** | Siswa ingin menambah meeting (renew) atau mengganti Product di session yang sudah ada. Ini yang direkomendasikan sistem |
| **Order Add Ons** | Siswa hanya ingin menambahkan Add-Ons ke Session yang sedang berjalan |
| **Order New Product** | Memulai session baru, misalnya siswa yang sudah belajar coding ingin menambah course Math/English yang berjalan bersamaan, atau menambah session berupa Event Bootcamp |

**Kondisi 3 — Siswa sudah memiliki Session Event**

- **Order New Product** — jika siswa ingin membeli Package (kelas reguler) atau Event baru.
- **Order Add Ons** — jika siswa hanya ingin menambahkan add-ons ke Session Event yang sedang berjalan.

### Kolom saat Make an Order

| Kolom | Keterangan |
| --- | --- |
| **Select A Product** | Produk (package) yang akan dibeli siswa |
| **Variant** | Varian harga yang dipilih (misal 1x/minggu atau 2x/minggu) |
| **Quantity Meeting** | Kuota pertemuan yang dibeli customer |
| **Class Type** | Tipe kelas yang akan diikuti (Adaptive/Group) |
| **Special Price** | Harga khusus untuk customer. Mengaktifkan ini akan **mengabaikan variant harga** yang dipilih |
| **Add Class** | Meng-assign kelas kepada siswa sesuai Class Type-nya |
| **Add-ons** | Produk pendukung, opsional |
| **Add more Product** | Jika customer masih ingin menambah produk (Add-ons atau item) lagi |

Contoh Special Price: harga variant awal Rp120.000 diabaikan dan berubah menjadi Rp85.000. Harga ini dapat disimpan untuk pembelian berikutnya dengan **Save This Price for Next Payment**.

### Aturan penting saat generate invoice

> Saat pembuatan invoice, hanya bisa order **1 Package untuk 1 Session**. Jika ingin order 2 Package berbeda, lakukan 2x pembuatan Invoice dengan Session masing-masing.

Sebelum invoice di-generate, admin dapat crosscheck kembali produk yang akan dibeli. Order juga dapat disimpan sebagai **Draft**.

**Apply Discount:** pengaplikasian discount pada customer hanya berlaku **1x penggunaan untuk 1 customer**. Contoh: Discount Sibling digunakan saat registrasi, maka pada pembayaran berikutnya discount tersebut tidak boleh dipergunakan lagi untuk customer itu.

---

## Send Payment Link to Customer

**Jalur menu:** Accounting → Invoice → Invoice/Payment

### Isi tabel Invoice List

| Kolom | Keterangan |
| --- | --- |
| Invoice Number | Nomor invoice, digunakan untuk mengonfirmasi pembayaran secara manual |
| Payment Link | Link pembayaran untuk orang tua |
| Customer | Nama orang tua |
| Issued Date | Tanggal invoice di-generate |

### Status Invoice

| Status | Arti |
| --- | --- |
| **Paid** | Invoice sudah dibayarkan |
| **Waiting Payment** | Menunggu pembayaran invoice |
| **Cancelled** | Invoice dibatalkan, biasanya karena ada kesalahan |

Tombol Action yang muncul bervariasi tergantung status: melihat detail invoice, membayar invoice, atau membatalkan invoice.

### Alur dari sisi orang tua (POV Parent)

1. Admin copy payment link dan mengirimkannya ke orang tua.
2. Parent mendapatkan notifikasi chat WhatsApp berisi link pembayaran dari Admin.
3. Parent mengklik link tersebut.
4. Parent klik **Pay**, memilih metode pembayaran, dan membayar melalui Midtrans.

Ketika pembayaran berhasil, status berubah menjadi **Paid** dan Product yang dibeli langsung ditambahkan pada Session.

> **Pengecualian:** dalam beberapa kasus Product tidak langsung ditambahkan ke Session, melainkan masuk ke **Pending Product** dan harus di-Redeem oleh Admin sebelum bisa digunakan Student.

---

## Paid Invoice Manually

**Jalur menu:** Accounting → Invoice → Invoice/Payment

Pembayaran manual dapat dilakukan dengan dua cara: melalui menu Accounting atau melalui preview invoice. Keduanya memiliki fungsi sama, gunakan tombol **Set to Paid**.

### Aturan tanggal pada Set to Paid

Admin dapat memilih tanggal Dibayar secara manual dalam rentang valid: **dari Tanggal Invoice Diterbitkan hingga tanggal hari ini**.

Contoh:

- Tanggal Faktur Diterbitkan: 13 November
- Hari ini (hari admin memprosesnya): 24 November
- Rentang tanggal Dibayar yang diizinkan: 13 November → 24 November

Jika siswa sebenarnya membayar pada 22 November tetapi admin baru memverifikasi pada 24 November, admin masih dapat memilih 22 November. **Tanggal setelah 24 November tidak dapat dipilih.**

---

## Pending Product & Redeem

Setelah status Invoice menjadi "Paid", Product otomatis ditambahkan ke Session milik Student, **kecuali** pada kondisi berikut:

1. Pembelian Package yang **sama** namun terdapat **perbedaan harga** antara Package yang sedang aktif di Session dan Package yang baru dibeli (beda Variant).
2. Pembelian Package yang **berbeda**.

Pada kondisi di atas, Product tidak otomatis ditambahkan dan memerlukan proses **Redeem** terlebih dahulu dari menu Pending Product.

### Kasus 1 — Package sama, harga berbeda

Contoh: siswa telah memiliki package dengan varian Bahasa Indonesia, kemudian ingin mengganti varian menjadi English, di mana harga kedua varian berbeda. Diperlukan Redeem karena perbedaan harga package yang diorder.

> Perbedaan harga di sini **termasuk** ketika admin menggunakan **Special Price** saat order Invoice.

Setelah berhasil Redeem, session akan berganti sesuai package baru yang telah diorder.

### Kasus 2 — Order package berbeda melalui session

Jika admin order melalui session, perlu melakukan **Convert to Balance** terlebih dahulu. Setelah Redeem, Package baru akan **me-replace** Package sebelumnya.

---

## Generate Schedule

**Jalur menu:** Class → List Class → Action Button → Schedules → Generate Schedule

Setelah siswa join kelas dan sudah bayar invoice, Admin harus generate jadwal kelas agar terus terhubung dengan jadwal Learning Session siswa.

### Aturan Generate Schedule

- Jadwal selama **sebulan ke depan** akan muncul; jadwal berikutnya muncul otomatis saat sudah memasuki bulan tersebut, sehingga tidak perlu Generate Schedule lagi.
- Jadwal hanya bisa di-generate ketika **ada participants**.
- Generate Schedule hanya dilakukan **1x saja**, saat Class pertama kali dibuat.
- Jika saat membuka halaman Schedule jadwal kelas sudah muncul, **tidak perlu** Generate Schedule lagi.

---

## Check Todays Attendance

Pada halaman ini Admin dapat melihat kelas yang sedang dan akan berlangsung pada hari itu.

### Pembagian tanggung jawab

| Peran | Tanggung jawab |
| --- | --- |
| **Teacher** | Mengubah status jadwal kelas menjadi start, meng-absen siswa, memberikan key kepada siswa |
| **Admin** | Melakukan pengecekan terhadap kehadiran siswa, meng-approve absen yang sudah dibuat |

Untuk mempermudah melihat list kelas yang butuh approval, admin dapat mengaksesnya lewat **Menu → Approval**.

### Filter pada List Attendance

- **Select Date** — mencari berdasarkan tanggal (bisa tanggal sebelumnya maupun yang akan datang)
- **Class Type** — berdasarkan tipe kelas (Group/Adaptive)
- **Select Course** — berdasarkan kursus yang diikuti siswa
- **Search** — berdasarkan nama kelas atau nama siswa

### Risiko jika absensi tidak di-approve

> Admin **harus dan wajib** meng-approve absen siswa, karena dengan begitu kuota/kuantiti meeting siswa akan berkurang.

**Q: Apa dampaknya jika Admin terlewat/tidak approve absensi?**
A: Kuota siswa tidak berkurang. Dampaknya penagihan invoice menjadi tidak sesuai dan siswa mengikuti kelas secara gratis.

---

## Latihan (Challenge) Chapter 3

- **Challenge 8a** — Buat dua session dengan dua student berbeda dan dua product berbeda.
- **Challenge 8b** — Paid-kan siswa yang sudah di-generate invoice-nya.
- **Challenge 9** — Generate Schedule di kelas yang sudah dibuat pada challenge sebelumnya, lalu cek jadwal kelas di class attendance pada tanggal yang seharusnya ada.
