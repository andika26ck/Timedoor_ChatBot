---
judul: CMS Admin - Chapter 6 FAQ
kategori: FAQ
domain: CMS Admin
label: [faq, troubleshooting, kasus, admin]
sumber_asli: Notion - Academy LMS - Knowledge Base > CMS Admin - Chapter 6 FAQ
terakhir_update: 2026-07-28
---

# CMS Admin - Chapter 6 FAQ

## Ringkasan
2. Klik **See Details** pada session yang dimaksud

---

## Jadwal & Kelas
**Q1: Bagaimana cara mengubah jadwal utama (repetitif) siswa?**
1. Buka menu **Student** → cari nama siswa → klik **Session** pada Action
2. Klik **See Details** pada session yang dimaksud
3. Scroll ke bagian Schedule, hapus jadwal lama (Delete Schedule)
4. Tambahkan jadwal baru sesuai keinginan siswa (isi Day, Start Time, End Time)
5. Cek kembali **Upcoming Class** — jadwal lama yang sudah tidak relevan perlu di-drop manual
6. Tambahkan jadwal baru via **Add Extra Class** untuk setiap hari yang berubah
> Sistem tidak otomatis meng-generate jadwal baru setelah jadwal utama diubah.
**Q2: Bagaimana cara mengubah jadwal siswa yang sudah di-drop? (Siswa batal cancel)**
1. Cari siswa → klik **Session** → **See Details**
2. Ingat nama product dan cek Class siswa di tab **Schedule Setting** (perhatikan hari dan tanggal yang di-drop)
3. Buka menu **List Class** → cari nama kelas → klik **See Details** → tab **Schedule** → cari tanggal kelas yang di-drop → **See Details**
4. Pada Student List, cari nama siswa → klik **Delete Student**
5. Tambahkan kembali siswa yang dihapus dengan **Add Student**
6. Cari nama student, pilih session, klik **Save Changes**
7. Verifikasi di **Session Detail** → tab **Schedule Setting** bahwa jadwal sudah tidak drop
8. Verifikasi juga di **Attendance** pada tanggal yang sesuai
**Q5: Apa yang dilakukan jika siswa bergabung ke kelas yang sudah berjalan?**
Siswa baru tidak otomatis ter-assign ke jadwal yang sudah ada. Admin harus:
1. Buka menu **List Class** → cari kelas → klik **Schedules** → tab **Participants**
2. Klik **Add Students**
3. Pilih tanggal mulai siswa masuk kelas
4. Pilih jadwal kelas yang sesuai dengan main class siswa
5. Klik **Next** → pilih jadwal-jadwal ke depannya
6. Jadwal setelah tanggal yang dipilih akan ter-generate otomatis oleh sistem
**Q7 (versi baru): Bagaimana cara mengubah jam kelas siswa di hari yang sama?**
1. Buka menu **Class** → **List Class** → cari nama kelas → **Detail**
2. Masuk ke tab **Schedule**
3. Pilih hari dan jam yang ingin dicancel, klik **Cancel** (jika masih ada siswa lain di jadwal itu, tidak perlu dicancel)
4. Tambahkan jadwal baru via **Add Schedule** sesuai jam yang diinginkan
5. Masuk ke **Detail Class** → pastikan nama siswa sudah masuk. Jika belum, tambahkan manual via **Add Student**
---
## Student & Session
**Q2: Apa yang dilakukan jika siswa berhenti les (drop) di tengah course?**
1. Buka **Student** → cari siswa → klik **Session**
2. Klik **See Details** pada session yang dimaksud
3. Jika siswa masih punya sisa meeting, klik **Convert Meeting to Balance** terlebih dahulu
4. Klik **Drop Session** → pilih alasan drop → klik **Save**
5. Kembali ke halaman Student Detail
6. Klik **Non-Active Student** jika siswa sudah tidak memiliki session aktif apapun
**Q3: Apa yang dilakukan jika siswa sudah selesai course dan mau lanjut ke course berikutnya?**
1. Buka **Student** → cari siswa → klik **Session** → pilih session → **See Details**
2. Masuk ke tab **Book History** → klik **Details**
3. Klik **Finish Course** → masukkan alasan
4. Klik **Generate Certificate** → klik **Download** untuk unduh sertifikat
5. Klik **Upgrade Course** → orderkan package baru yang diinginkan siswa
> Jika tidak jadi klik Upgrade Course, sertifikat bisa dicari di Session Detail.
**Q4: Apa yang dilakukan jika siswa ingin mengganti package di pertengahan meeting?**
1. Buka session siswa → klik **Convert Meeting to Balance**
2. Balance siswa tersimpan dan bisa dilihat di Student Detail
3. Saat order package baru, aktifkan **Pay with Student Balance**
4. Orderkan package baru yang diinginkan
**Q6: Apa yang dilakukan jika siswa mau ikut kelas sebelum membayar (Paylater)?**
1. Buka menu **Accounting** → **Invoice** → pilih invoice siswa
2. Klik **Action** → **Set to Paid** → pilih opsi **Paylater**
3. Siswa langsung bisa diabsen dan diberikan kunci kelas
4. Tagihan paylater bisa dipantau di menu **Accounting** → **Paylater**
**Q8: Bagaimana cara menagihkan lebih dari 1 invoice ke parent yang sama (siblings)?**
1. Klik menu **Invoice** → **Make an Order**
2. Cari dan pilih nama Parent yang punya 2+ anak
3. Pilih siswa yang akan dibuatkan invoice
4. Input product masing-masing siswa
5. Klik **Generate Invoice** → invoice akan berisi 2 siswa
6. Klik **Detail Invoice** → Copy link → kirim ke parent
**Q9: Bagaimana cara menambahkan anak di parent yang sama?**
1. Daftarkan inquiry terlebih dahulu
2. Saat register, cari nama parent yang sudah terdaftar — data akan auto-filled
3. Klik **Continue** → di Student Info, klik **Add Children** untuk menambahkan anak berikutnya
**Q13: Bagaimana cara mengetahui status learning session siswa?**
Buka menu **Student** → lihat kolom **Learning Status**.
| Status | Arti |
| --- | --- |
| Idle | Sudah bayar tapi belum mulai kelas pertama (termasuk skema DP atau Paylater) |
| Ongoing | Aktif mengikuti kelas dan masih punya sisa kuota |
| Postponed | Status diatur Postponed (manual atau otomatis oleh sistem) |
| Not Joined | Belum membeli paket apapun |
| Drop | Session dinonaktifkan oleh admin |
**Q15: Apakah siswa yang pindah branch progressnya ikut berpindah?**
Ya, seluruh proses akan ikut berpindah. Langkah:
1. Koordinasi dengan admin lama mengenai materi, lesson progress, dan kuota meeting
2. Request perpindahan ke Regional Manager yang memiliki akses kedua branch
3. Jika Regional Manager tidak memiliki akses branch yang dituju, request ke System Support
**Q28: Bagaimana cara postponed dan drop session siswa?**
Postponed (cuti sementara):
1. Buka Session siswa → klik **Postpone Session**
2. Centang alasan postponed → tambahkan note jika perlu
3. Untuk mengaktifkan kembali, klik **Active Session**
**Pilihan Alasan Postponed:**
| Kategori | Alasan |
| --- | --- |
| Academic | Exam period / school workload |
| Academic | Schedule conflict with school |
| Personal | Health issue |
| Personal | Family Event / Holiday |
| Personal | Schedule conflict with other courses |
| Personal | Parent busy period |
Drop (berhenti permanen):
1. Buka Session siswa → klik **Drop Session**
2. Pilih alasan drop → klik **Save**
3. Jika di tengah jalan siswa ingin kembali belajar, klik **Order Product** di session yang sama
**Pilihan Alasan Drop:**
| Kategori | Alasan |
| --- | --- |
| School Factors | Exam period / school workload |
| School Factors | School activities / schedule conflict |
| School Factors | Boarding school |
| Personal / Life | Moved away (to another city or country) |
| Personal / Life | Non-school schedule clash |
| Personal / Life | Health issue / burnout |
| Personal / Life | Family finances |
| Academy's Experience | Not the right fit |
| Academy's Experience | Teacher or management issue |
| Academy's Experience | Technical / online learning problems |
| Academy's Experience | Goal achieved / learned enough |
---
## Product & Invoice
**Q10: Package tidak bisa dipilih saat order — apa yang harus dilakukan?**
Package belum memiliki variant price. Langkah:
1. Buka menu **Product** → **Package** → cari nama package → klik **Detail**
2. Masuk ke tab **Variant** → klik **Edit Variant**
3. Masukkan harga (jika sama dengan Base Price, centang kolom yang tersedia)
4. Klik **Add Variant** jika ingin menambah lebih dari 1 variant harga
5. Klik **Save**
**Q11: Bagaimana melakukan order setelah siswa trial dan mau ikut kelas regular?**
1. Buka session trial siswa
2. Klik **Order Product**
3. Halaman pembuatan invoice terbuka via session trial tersebut
4. Isi product yang diinginkan → Generate Invoice
> Tidak perlu **Change Learning Session** karena siswa melanjutkan dari session trial yang sama.
**Q12: Bagaimana cara melihat invoice berbayar dan free?**
1. Buka menu **Accounting** → **Invoice** → tab **Invoice/Payment**
2. Gunakan filter **Invoice Type** untuk memilah invoice berbayar (Billed) dan gratis (Free)
Invoice Free: invoice trial gratis, invoice hasil convert balance, invoice yang menggunakan Special Price 0.
**Q24: Bagaimana cara cancel invoice?**
Invoice status Waiting Payment:
1. Buka invoice → klik **Detail**
2. Klik **Cancel Invoice** di sisi kanan → konfirmasi
Invoice yang sudah Paid: Admin tidak bisa cancel secara mandiri. Jika urgent, sampaikan alasan dan request ke **System Support**.
**Q25: Bagaimana supaya siswa tidak kehabisan kuota atau terlambat dibelikan?**
Pantau menu **Student** → **Invoice** → **Upcoming Contract** secara rutin. Halaman ini menampilkan siswa yang kuota meetingnya hampir habis atau akan expired.
**Q26: Kapan produk yang telah dibeli harus di-Redeem?**
Product masuk ke Pending Product (harus di-Redeem) jika:
1. Order Package yang sama tapi harga berbeda (beda variant atau Special Price)
2. Order Package yang berbeda
Setelah di-Redeem, kuota akan **ter-replace** (bukan bertambah).
**Q27: Kapan admin perlu Convert Meeting Left to Balance?**
Saat siswa ingin **mengganti package atau variant** dan masih memiliki sisa meeting aktif. Convert dilakukan agar sisa meeting tidak hilang dan bisa digunakan sebagai credit untuk pembelian package baru.
**Q34: Bagaimana cara admin melakukan order package?**
Ada 3 cara — pilih berdasarkan situasi:
| Cara | Kapan Digunakan |
| --- | --- |
| **Make an Order** (menu Accounting) | Untuk student baru atau siswa yang ingin belajar 2 materi sekaligus (membuat Session baru) |
| **Upcoming Contract** | Untuk siswa yang ingin Renew (kuota hampir habis, expired, atau postponed) |
| **Order via Session** | Untuk siswa yang ingin Upgrade Package, ganti variant, atau ganti bahasa |
Order via Upcoming Contract dan Session memiliki tampilan yang sama, dengan opsi **Change Learning Session** untuk memilih apakah order me-replace session lama atau membuat session baru.
---
## Teacher & Room
**Q16: Bagaimana cara register teacher dan assign skill?**
1. Buka menu **Teacher** → **List Teacher** → **Add New**
2. Lengkapi seluruh data → klik **Save**
3. Untuk mengubah atau menambahkan skill setelahnya: buka profil teacher → klik **Edit Teacher Details**
Skill teacher menentukan buku apa saja yang bisa diakses teacher di akun CMS-nya.
**Q17: Bagaimana jika teacher sudah tidak mengajar?**
1. Buka menu **Teacher** → **List Teacher** → cari nama teacher → klik **Detail**
2. Klik **Resign Teacher**
**Q18: Bagaimana cara membuat room?**
Ikuti langkah di Chapter 1.2. Room yang berhasil dibuat akan bisa dipilih saat menambahkan schedule ketika create class.
**Q19: Bagaimana cara check jadwal pada room?**
1. Buka menu **Room** → tab **Availability**
2. Admin dapat melihat jadwal room per minggu dan per hari sesuai tanggal yang dipilih
**Q20: Tipe Group atau Adaptive yang mana yang harus dipilih?**
- **Adaptive** — siswa dalam 1 kelas mempelajari buku yang berbeda-beda
- **Group** — siswa dalam 1 kelas mempelajari buku yang sama
Tipe ini ditentukan saat **Create Class** dan saat **Order Package** siswa.
---
## Data & Akun Student
**Q21: Bagaimana cara mendaftarkan anak yang parentsnya sudah terdaftar?**
1. Daftarkan inquiry terlebih dahulu
2. Saat register, cari nama parent yang sudah ada di kolom Parents Name
3. Data parent akan auto-filled → klik **Continue**
4. Di Student Info, gunakan **Add Children** untuk menambahkan anak lainnya
**Q22 & Q33: Bagaimana jika student tidak bisa atau gagal login?**
1. Pastikan link yang digunakan benar: [**lms.timedooracademy.com**](http://lms.timedooracademy.com)
2. Pastikan koneksi internet stabil
3. Jika masih gagal, buka menu **Student** → cari nama siswa → klik **Detail**
4. Klik **Set Password** → ubah password sesuai username siswa untuk memudahkan login
5. Coba login kembali
**Q23: Bagaimana jika student ingin update data (nomor HP, email, dll)?**
1. Buka menu **Student** → cari nama siswa → klik **Detail**
2. Klik **Edit Data Student** di sisi kanan
3. Ubah data yang diperlukan → klik **Save**
---
## Report & Materi
**Q14: Bagaimana jika report tidak ada homeroom teacher-nya?**
Saat membuat invoice dan memilih kelas yang belum punya main teacher, sistem akan menampilkan reminder. Admin tetap bisa memilih kelas tersebut, tapi harus segera set homeroom teacher di **Session Setting** siswa.
**Q29: Bagaimana jika materi siswa tiba-tiba terkunci?**
Untuk kondisi urgent (siswa tidak bisa membuka materi):
1. Buka **Session Detail** siswa
2. Pilih session yang sedang dipelajari
3. Klik **See Meeting History** → **Lesson Progress**
4. Unlock manual pada lesson yang akan dipelajari
> Unlock by admin hanya untuk kondisi urgent agar siswa tetap bisa belajar.
**Q30: Bagaimana cara memunculkan lesson pada report?**
Report dibuat setiap siswa menyelesaikan 8 meeting. Sebelum membuat report, teacher harus menyelesaikan **Meeting Journal** terlebih dahulu.
1. Lengkapi meeting journal (meeting ke sekian, learning object, score, note) → Save
2. Pindah ke tab pembuatan report → klik **Create Report**
3. Lengkapi data yang dibutuhkan
Lesson yang muncul di report adalah meeting journal yang sudah diisi.
**Q31: Bagaimana jika report terdapat point yang kurang tepat?**
1. Buka menu **Approval** → **Approval Report**
2. Klik **Preview Report** dan koreksi secara menyeluruh (nama siswa, nama teacher, kelas, materi, dll)
3. Jika sudah benar → **Approve**
4. Jika ada kesalahan → klik **Edit Report** atau informasikan ke teacher untuk revisi/recreate report
**Q32: Apa perbedaan Add-Ons dengan Item?**
- **Add-Ons** — mengikuti session. Absen add-ons berjalan bersamaan dengan absen kehadiran kelas.
- **Item** — tidak terikat session. Bisa diorder bersamaan dengan package atau sendiri. Dikirim langsung ke siswa (fisik/digital). Item yang tersedia per branch berbeda, koordinasikan dengan Regional Manager.
