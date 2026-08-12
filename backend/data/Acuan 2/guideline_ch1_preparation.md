---
judul: Chapter 1 - Preparation (Teacher, Room, Class, Event/Trial)
kategori: SOP
domain: CMS Admin
label: [preparation, teacher, room, class, event, trial, workshop, bootcamp]
sumber_asli: Figma - [ID] Branch Admin_System Guidelines, slide 5-43
terakhir_update: 2026-07-28
---

# Chapter 1 - Preparation (Teacher, Room, Class, Event/Trial)

## Ringkasan

Langkah persiapan awal cabang di CMS: membuat akun Teacher, membuat Room, membuat Class (tipe Group dan Adaptive), serta membuat Event/Trial beserta aturan tipe event.

---

## Create Teacher

**Tujuan:** membuat akun Teacher dan mengoperasikannya (mengecek informasi, kehadiran, dan ketersediaan).

**Jalur menu:** Teacher → List Teacher → Add New

### Kolom saat Add Teacher

| Kolom | Keterangan |
| --- | --- |
| Branch | Cabang tempat Teacher mengajar, dapat diisi lebih dari 1 |
| Language (Bahasa) | Kemampuan bahasa Teacher dalam mengajar |
| Skill | Menentukan buku apa saja yang dapat diakses Teacher melalui CMS-nya |
| Score | Nilai kinerja Teacher yang dievaluasi tiap Performance Review (opsional) |

Setelah semua kolom diisi, klik **SAVE**.

### Aturan penting

- Pastikan menggunakan **email aktif**, karena credential akun akan dikirim ke email tersebut.
- Ada toggle untuk mengaktifkan akun teacher dan mengatur tanggal registrasi.
- Setelah berhasil didaftarkan, Teacher muncul di List Teacher dan credential dikirim ke emailnya. **Jangan lupa cek folder Spam.**

### Tombol Action pada List Teacher

Mengarahkan ke tiga halaman:

- **Detail Teacher** — menampilkan dan mengedit informasi Teacher; admin juga dapat mengganti password akun Teacher bila diperlukan.
- **Attendance** — memeriksa kehadiran Teacher pada kelas.
- **Availability** — memeriksa jadwal mengajar dan ketersediaan waktu Teacher.
- **Resign** — untuk Teacher yang berhenti.

---

## Create Rooms

**Tujuan:** membuat Room dan mengoperasikannya (mengedit informasi dan mengecek ketersediaan).

**Jalur menu:** Room → Add New

### Kolom Room

| Kolom | Keterangan |
| --- | --- |
| Room | Ruangan fisik (tempat) di mana siswa berkumpul dan belajar |
| Capacity | Kapasitas ruangan untuk menampung siswa |
| Branch | Penempatan ruangan di branch |
| Zoom Link | Diisi jika kelas dilaksanakan online (boleh dikosongkan) |

Room akan muncul di list setelah berhasil dibuat.

### Aturan penghapusan Room

> Room hanya boleh dihapus ketika **belum terpakai sama sekali**.

### Tab Availability

- Admin dapat mengecek ketersediaan ruangan sesuai tanggal, per minggu, dan per hari.
- Room yang muncul adalah ruangan yang **sudah terisi oleh siswa**.
- Status jadwal ditandai warna: **hijau** = jadwal valid, **merah** = jadwal ditiadakan karena hari libur atau pembatalan.
- Admin dapat mem-filter ketersediaan berdasarkan Branch dan ruangan tertentu.

---

## Create Class

**Tujuan:** membuat Class dan mengoperasikannya (mengedit, cek peserta, cek jadwal, cek absensi).

**Jalur menu:** Class → List Class → Add New

Class adalah grup belajar yang menghubungkan Siswa, Pengajar, dan Jadwal.

### Dua tipe Class

| Tipe | Keterangan |
| --- | --- |
| **Group** | Seluruh siswa mempelajari Book yang sama. Hanya siswa yang membeli Package dengan Book tersebut yang bisa dimasukkan ke Group Class. Perlu mengisi Book dan Lang (bahasa buku). |
| **Adaptive** | Variasi Book berbeda-beda untuk tiap siswa. Siswa dengan Book apa pun bisa digabungkan tanpa harus memiliki Book yang sama. |

### Kolom lain

- **Class Name** — gunakan aturan penamaan kelas yang berlaku.
- **Branch** — pilih sesuai branch Anda.
- **Start Date** — tanggal pertama kali kelas dimulai.
- **Add Schedule** — admin dapat mengecek ketersediaan ruangan melalui filter (hari dan jam), lalu menambahkan jadwal kelas ke ruangan yang tersedia.

### Assign Teacher ke Class

**Jalur:** buka Detail Class → Tab Participant → Add Teacher

> **Aturan:** apabila terdapat lebih dari 1 jadwal (schedule), maka **setiap jadwal** mengajar Teacher harus di-assign. Admin wajib memastikan setiap hari/schedule yang ada sudah punya Teacher.

**Fitur Set as Assistant:** Assistant Teacher dapat membantu kegiatan belajar mengajar dan dapat menggantikan Main Teacher apabila berhalangan hadir.

Sebaiknya Class dibuat setelah Teacher tersedia.

---

## Create Events / Trials

**Jalur menu:** Product → Event → Create Event

### Apa itu Event

Event adalah Product yang dibuat untuk kegiatan atau program yang **hanya berlangsung satu kali** dan sudah dijadwalkan pada waktu tertentu. Setiap Event dibuat oleh masing-masing cabang (Admin), sehingga Book, harga, dan jadwalnya bisa disesuaikan dengan kebutuhan. Saat Event dibeli, pembelian tersebut akan **membentuk Session**.

### Tipe Event

| Tipe | Penggunaan |
| --- | --- |
| **Trial** | Kelas percobaan gratis atau berbayar (jika berlaku), diadakan cabang secara mingguan |
| **Workshop** | Kegiatan workshop yang diselenggarakan di cabang atau di sekolah |
| **Bootcamp** | Berbagai acara bootcamp, seperti Holiday Camp tahunan |
| **Extra Class** | Kelas tambahan bagi siswa yang tertinggal sesi sebelumnya, atau sesi latihan tambahan (misal persiapan lomba). Saat create event, Extra Class masuk pada tipe **Workshop** |

### Aturan harga, jadwal, dan buku per tipe Event

| Event Type | Price | Schedule | Book |
| --- | --- | --- | --- |
| Trial | Gratis | Hanya 1 jadwal. Jika dalam satu hari terdapat 3 trial, buat 3 Event trial terpisah | Trial Books |
| Workshop | Gratis atau Berbayar | Boleh 1 atau lebih jadwal. Jika Workshop berlangsung 3 hari, cukup buat 1 workshop dengan 3 jadwal | Workshop Books |
| Bootcamp | Gratis (jarang digunakan) atau Berbayar | Boleh 1 atau lebih jadwal. Jika Bootcamp berlangsung 3 hari, cukup buat 1 bootcamp dengan 3 jadwal | Bootcamp Books |

### Catatan saat membuat Event

- **Currency wajib diisi** meskipun event gratis, untuk mengetahui default currency (IDR, MYR, PHP, dan lain-lain).
- Apabila kegiatan lebih dari 1x dalam seminggu, Admin wajib memastikan Teacher ter-assign di setiap jadwal kegiatan.

### Detail Event

- **Tab Details** — terdapat opsi untuk menonaktifkan event agar tidak bisa digunakan.
- **Tab Participant** — admin meng-assign Teacher ke event, serta dapat menghapus atau menentukan role Main Teacher dan Assistant Teacher melalui action button.

### Aturan penghapusan Event

> Hanya boleh menghapus event yang dibuat tapi **tidak pernah dibeli** siswa mana pun.

---

## Latihan (Challenge) Chapter 1

- **Challenge 1** — Registrasikan 3 Teacher ke dalam sistem, infokan detail teacher beserta credential (username dan password) ke Trainer System.
- **Challenge 2** — Daftarkan 3 Room di Branch Anda ke dalam sistem.
- **Challenge 3** — Buat 2 kelas tipe Adaptive dan 2 kelas tipe Group, masing-masing dengan 3 jadwal berbeda dan buku bebas, tanpa menambahkan murid.
- **Challenge 4** — Buat 1 Trial gratis coding yang diadakan besok, dan 1 Event Bootcamp berbayar yang diadakan 2 hari lagi.
