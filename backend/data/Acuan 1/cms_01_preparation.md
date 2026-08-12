---
judul: CMS Admin - Chapter 1 Preparation
kategori: SOP
domain: CMS Admin
label: [preparation, master-data, teacher, kelas, branch]
sumber_asli: Notion - Academy LMS - Knowledge Base > CMS Admin - Chapter 1 Preparation
terakhir_update: 2026-07-28
---

# CMS Admin - Chapter 1 Preparation

## Ringkasan
Saat pertama masuk CMS, terdapat beberapa elemen utama:

---

## Overview CMS
Saat pertama masuk CMS, terdapat beberapa elemen utama:
- **Branch Option** — untuk memilih cabang yang ingin diakses
- **Sidebar** — navigasi ke semua menu
- **Dashboard** — ringkasan data analisis (inquiry, invoice, monitoring cabang)
- **Country / Light-Dark Mode / Profile** — pengaturan negara, tampilan, dan akun
## Urutan Setup Awal
Sebelum mulai operasional, pastikan setup dilakukan dengan urutan berikut:
1. Buat Teacher
2. Buat Room
3. Buat Class (membutuhkan Teacher dan Room)
4. Buat Event/Trial (membutuhkan Teacher dan Room)
> Teacher dan Room **harus dibuat lebih dulu** sebelum membuat Class atau Trial.
---
## 1.1 Create Teacher
**Tujuan:** Mendaftarkan akun teacher ke dalam sistem.
**Langkah:**
1. Klik menu **Teacher** pada sidebar
2. Klik **List Teacher**
3. Klik **Add New**
4. Isi kolom berikut:
	- **Branch** — cabang tempat teacher mengajar (bisa lebih dari 1)
	- **Language** — kemampuan bahasa mengajar
	- **Skill** — menentukan buku apa saja yang bisa diakses teacher di CMS-nya
	- **Score** *(opsional)* — nilai kinerja untuk evaluasi Performance Review
	- **Email aktif** — wajib diisi karena credentials akan dikirim ke email ini
	- **Registration Date** — atur tanggal registrasi
	- **Active toggle** — aktifkan akun teacher
5. Klik **Save**
**Hasil:** Teacher muncul di List Teacher dan credentials dikirim ke email (cek folder Spam jika tidak masuk inbox).
**Fitur Action di List Teacher:**
- **Detail** — lihat dan edit informasi teacher, ganti password
- **Attendance** — cek kehadiran teacher di kelas
- **Availability** — cek jadwal mengajar dan ketersediaan waktu teacher
- **Resign** — gunakan jika teacher sudah tidak mengajar
---
## 1.2 Create Room
**Tujuan:** Mendaftarkan ruang belajar fisik (atau online) ke dalam sistem.
**Langkah:**
1. Klik menu **Room** pada sidebar
2. Klik **Add New**
3. Isi kolom berikut:
	- **Room Name** — nama ruangan
	- **Capacity** — kapasitas maksimal siswa
	- **Branch** — penempatan ruangan di branch
	- **Zoom Link** *(opsional)* — isi jika kelas dilaksanakan secara online
4. Klik **Save**
**Catatan:** Room hanya boleh dihapus jika belum pernah digunakan sama sekali.
**Tab Availability:**
Admin dapat mengecek ketersediaan ruangan berdasarkan tanggal, per minggu, atau per hari.
- Jadwal warna **hijau** = valid
- Jadwal warna **merah** = ditiadakan (hari libur atau pembatalan)
---
## 1.3 Create Class
**Tujuan:** Membuat grup belajar yang menghubungkan siswa, teacher, dan jadwal.
**Langkah:**
1. Klik menu **Class** → **List Class**
2. Klik **Add New**
3. Isi kolom berikut:
	- **Class Name** — gunakan aturan penamaan kelas (lihat Naming Rules)
	- **Branch** — pilih sesuai branch
	- **Class Type:**
		- **Group** — semua siswa mempelajari buku yang sama. Hanya siswa yang membeli Package dengan buku tersebut yang bisa dimasukkan.
		- **Adaptive** — setiap siswa bisa memiliki buku berbeda. Siswa dengan buku apapun bisa digabungkan.
	- **Book** — buku yang di-assign ke Group Class
	- **Lang** — bahasa yang digunakan
	- **Start Date** — tanggal pertama kelas dimulai
	- **Add Schedule** — cek ketersediaan ruangan via filter (Hari dan Jam), lalu tambahkan jadwal
4. Klik **Save**
**Assign Teacher ke Class:**
1. Buka Detail Class
2. Masuk ke tab **Participant**
3. Klik **Add Teacher**
4. Jika ada lebih dari 1 jadwal, setiap jadwal harus di-assign teacher masing-masing
5. Fitur **Set as Assistant** tersedia untuk teacher pengganti
> Assistant Teacher dapat menggantikan Main Teacher apabila berhalangan hadir.
> **Catatan penting:** Hanya **Main Teacher** (teacher yang ada di Main Schedule) dan **Homeroom Teacher** yang bisa membuat Meeting Journal untuk siswa di kelas tersebut. Teacher pengganti yang hanya mengisi 1 jadwal tidak memiliki akses untuk membuat Meeting Journal.
---
## 1.4 Create Events / Trials
**Tujuan:** Membuat kegiatan atau program yang berlangsung satu kali pada waktu tertentu.
**Tipe Event:**
<table header-row="true">
<tr>
<td>Tipe</td>
<td>Harga</td>
<td>Jadwal</td>
<td>Buku</td>
</tr>
<tr>
<td>Trial</td>
<td>Gratis</td>
<td>Hanya 1 jadwal per event. Jika ada 3 trial dalam 1 hari, buat 3 event terpisah.</td>
<td>Trial Books</td>
</tr>
<tr>
<td>Workshop</td>
<td>Gratis atau Berbayar</td>
<td>Boleh 1 atau lebih jadwal. Jika berlangsung 3 hari, cukup buat 1 workshop dengan 3 jadwal.</td>
<td>Workshop Books</td>
</tr>
<tr>
<td>Bootcamp</td>
<td>Gratis (jarang) atau Berbayar</td>
<td>Boleh 1 atau lebih jadwal. Jika berlangsung 3 hari, cukup buat 1 bootcamp dengan 3 jadwal.</td>
<td>Bootcamp Books</td>
</tr>
<tr>
<td>Extra Class</td>
<td>Gratis atau Berbayar</td>
<td>Menyesuaikan kebutuhan. Digunakan untuk kelas tambahan siswa yang tertinggal sesi, atau persiapan latihan seperti lomba. Saat create event, tipe Extra Class masuk ke tipe Workshop.</td>
<td>Sesuai kebutuhan</td>
</tr>
</table>
> Panduan ini disusun berdasarkan praktik yang selama ini diterapkan oleh Academy, sebagai acuan membuat Event dengan benar dan konsisten.
**Langkah:**
1. Klik menu **Product** → **Event**
2. Klik **Create Event**
3. Isi seluruh kolom:
	- **Currency** wajib diisi meskipun event gratis (untuk menentukan default currency: IDR, MYR, PHP, dll)
	- Jika kegiatan lebih dari 1x dalam seminggu, pastikan Teacher ter-assign di setiap jadwal
4. Klik **Save**
**Assign Teacher ke Event:**
1. Buka **Detail Event**
2. Masuk ke tab **Participant**
3. Assign Teacher dan tentukan role: **Main Teacher** atau **Assistant Teacher**
**Menonaktifkan Event:**
Gunakan toggle di Detail Event untuk menonaktifkan event agar tidak bisa digunakan. Event hanya boleh dihapus jika belum pernah dibeli oleh siswa manapun.
