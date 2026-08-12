---
judul: CMS Admin - Chapter 3 Order Product
kategori: SOP
domain: CMS Admin
label: [order, product, package, add-ons, invoice]
sumber_asli: Notion - Academy LMS - Knowledge Base > CMS Admin - Chapter 3 Order Product
terakhir_update: 2026-07-28
---

# CMS Admin - Chapter 3 Order Product

## Ringkasan
Session adalah fitur yang memungkinkan 1 siswa mengikuti lebih dari 1 kelas (course) dalam waktu bersamaan. Di sistem lama, 1 siswa hanya bisa join 1 class. Di sistem baru, 1 siswa bisa memiliki beberapa learning session aktif sekaligus.

---

## 3.1 Product & Pricing
**Tujuan:** Memastikan setiap produk sudah memiliki harga variant sebelum bisa diorder.
**Tiga Jenis Produk:**
<table header-row="true">
<tr>
<td>Produk</td>
<td>Penjelasan</td>
<td>Contoh</td>
</tr>
<tr>
<td>**Package**</td>
<td>Produk kursus utama, barang jualan utama. Saat dibeli membentuk Session.</td>
<td>Little Programmer, Website Designer</td>
</tr>
<tr>
<td>**Add-Ons**</td>
<td>Produk tambahan opsional yang mengikuti Session. Kuota berkurang bersamaan dengan absen kehadiran.</td>
<td>Sewa Laptop, Sewa Kit IoT</td>
</tr>
<tr>
<td>**Item**</td>
<td>Produk independen, tidak terikat Session. Dikirim langsung ke siswa (fisik/digital).</td>
<td>Paket Kelas, Merchandise, Paket IoT</td>
</tr>
</table>
**Cara Set Harga Variant:**
1. Klik menu **Product** → **Package** (atau Add-Ons / Item)
2. Klik **Action Button** → **Detail**
3. Masuk ke tab **Variant**
4. Klik **Edit Variant**
5. Masukkan harga per meeting/pertemuan
6. Klik **Save**
> Jika variant harga belum di-set, package tidak bisa dibeli maupun digunakan.
> Package, Add-Ons, dan Items dibuat seragam untuk semua Branch. Jika ada yang belum tersedia di branch kamu, request ke Branch Manager untuk di-assign.
---
## 3.2 Create Session
**Apa itu Session?**
Session adalah fitur yang memungkinkan 1 siswa mengikuti lebih dari 1 kelas (course) dalam waktu bersamaan. Di sistem lama, 1 siswa hanya bisa join 1 class. Di sistem baru, 1 siswa bisa memiliki beberapa learning session aktif sekaligus.
**Flow Order Product Siswa:**
1. Admin register siswa + assign trial → siswa memiliki 1 session trial
2. Jika siswa mau lanjut les → Admin buat **1st Order (New Session)**
3. Jika siswa mau **mengganti** product → Order dilakukan **di dalam session yang sama** (tidak membuat session baru)
4. Jika siswa mau **menambah** product aktif → Order membuat **session baru**
**Langkah Make an Order:**
1. Klik menu **Accounting** → **Invoice** → **Make an Order**
2. Pilih nama siswa yang akan dibuatkan session
3. Isi kolom:
	- **Select A Product** — package yang akan dibeli
	- **Variant** — pilih varian harga (misal 1x/minggu atau 2x/minggu)
	- **Special Price** *(opsional)* — harga khusus yang mengabaikan variant price. Bisa disimpan untuk pembayaran berikutnya dengan 'Save This Price for Next Payment'
	- **Quantity Meeting** — kuota pertemuan yang dibeli
	- **Class Type** — Adaptive atau Group
	- **Add Class** — assign kelas sesuai Class Type
	- **Add-Ons** *(opsional)* — tambahan perangkat pendukung
4. Pilih **Save as Draft** atau **Continue** ke Generate Invoice
5. Cek kembali produk yang akan dibeli
6. Apply Discount jika ada (hanya berlaku 1x per customer)
7. Klik **Generate Invoice**
> Dalam 1 Session hanya bisa ada 1 Package. Untuk order 2 Package berbeda, lakukan 2x pembuatan Invoice dengan Session masing-masing.
---
## 3.3 Send Payment Link to Customer
**Langkah:**
1. Klik menu **Accounting** → **Invoice** → tab **Invoice/Payment**
2. Cari invoice yang dimaksud
3. Klik **Action Button** → **Copy Payment Link**
4. Kirimkan link ke orang tua (via WhatsApp atau channel lain)
**Status Invoice:**
<table header-row="true">
<tr>
<td>Status</td>
<td>Arti</td>
</tr>
<tr>
<td>Paid</td>
<td>Invoice sudah dibayarkan</td>
</tr>
<tr>
<td>Waiting Payment</td>
<td>Menunggu pembayaran</td>
</tr>
<tr>
<td>Cancelled</td>
<td>Invoice dibatalkan</td>
</tr>
</table>
**POV Parent:** Parent menerima link → klik Pay → memilih metode pembayaran → proses via Midtrans → status berubah menjadi Paid → Product otomatis ditambahkan ke Session.
---
## 3.4 Paid Invoice Manually
**Tujuan:** Membayar invoice secara manual (tanpa payment link dari customer).
**Langkah:**
1. Buka menu **Accounting** → **Invoice** → tab **Invoice/Payment**, atau buka **Preview Invoice** langsung
2. Klik **Set to Paid**
3. Pilih tanggal pembayaran — rentang valid dimulai dari tanggal invoice diterbitkan hingga hari ini
4. Klik **Save**
> **Aturan tanggal:** Admin dapat memilih tanggal Paid secara manual dalam rentang yang valid — dari Tanggal Invoice Diterbitkan hingga tanggal hari ini. Tanggal setelah hari ini tidak dapat dipilih.
> Contoh: Invoice diterbitkan 13 November, admin memverifikasi pada 24 November. Jika siswa sebenarnya membayar pada 22 November, admin tetap bisa memilih 22 November sebagai tanggal Paid meskipun baru diverifikasi pada 24 November.
---
## 3.5 Pending Product & Redeem
Setelah invoice Paid, product **tidak otomatis** masuk ke Session pada kondisi berikut:
1. Pembelian Package yang **sama** tapi **harga berbeda** — termasuk perbedaan variant atau penggunaan Special Price
2. Pembelian **Package yang berbeda**
Pada kedua kondisi di atas, product masuk ke **Pending Product** dan harus di-Redeem oleh admin terlebih dahulu sebelum bisa digunakan siswa.
**Langkah Redeem:**
1. Buka menu **Pending Product**
2. Cari product yang perlu di-redeem
3. Klik **Redeem**
> Setelah Redeem, Package baru akan **me-replace** Package sebelumnya (bukan menambah kuota ke session yang sama).
> Jika order Package **berbeda** melalui session yang masih memiliki kuota aktif, lakukan **Convert Meeting Left to Balance** terlebih dahulu, baru kemudian proses Redeem.
---
## 3.6 Generate Schedule
**Tujuan:** Menghubungkan jadwal kelas dengan Learning Session siswa.
**Kapan dilakukan:** Setelah siswa join kelas DAN sudah membayar invoice.
**Langkah:**
1. Klik menu **Class** → **List Class**
2. Klik **Action Button** → **Schedules**
3. Klik **Generate Schedule**
4. Jadwal 1 bulan ke depan akan muncul. Bulan-bulan berikutnya akan ter-generate otomatis.
**Aturan penting:**
- Jadwal hanya bisa di-generate jika sudah ada participants
- Generate Schedule hanya dilakukan **1x saja** saat Class pertama kali dibuat
- Jika jadwal sudah muncul, tidak perlu Generate Schedule lagi
---
## 3.7 Check Today's Attendance
**Pembagian Tanggung Jawab:**
<table header-row="true">
<tr>
<td>Pihak</td>
<td>Tanggung Jawab</td>
</tr>
<tr>
<td>**Teacher**</td>
<td>Mengubah status jadwal menjadi Start, mengabsen siswa, memberikan key kepada siswa</td>
</tr>
<tr>
<td>**Admin**</td>
<td>Mengecek kehadiran siswa, meng-approve absen yang sudah dibuat teacher</td>
</tr>
</table>
**Akses cepat untuk Admin:** Menu **Approval** untuk melihat list kelas yang butuh approval.
**Filter di halaman List Attendance:**
- Select Date — cari berdasarkan tanggal
- Class Type — cari berdasarkan tipe kelas (Group/Adaptive)
- Select Course — cari berdasarkan kursus
- Search — cari berdasarkan nama kelas atau nama siswa
> **WAJIB:** Admin harus approve absen siswa agar kuota meeting berkurang. Jika tidak di-approve, kuota siswa tidak berkurang dan siswa mengikuti kelas secara gratis — ini akan menyebabkan penagihan invoice yang tidak sesuai.
