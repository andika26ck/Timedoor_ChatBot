---
Kategori: FAQ
Domain: Known Risks
Topik: risiko, presensi, meeting-journal, send-key
---

## Known Risks & Undocumented Behaviors

### Ringkasan
Daftar risiko yang diketahui pada Academy LMS (terkait presensi, meeting journal, send key, unlock lesson, dan pembatalan jadwal) beserta dampak, status, dan saran perbaikan. Ditulis dalam format tanya-jawab supaya cocok dengan cara admin bertanya saat menghadapi masalah. Dokumen terkait: sysrules_01_system-rules.md (aturan sistem umum), teacher_07_create-meeting-journal.md (pengisian journal), teacher_05_attendance.md (alur presensi).

---

### Risiko yang Diketahui

#### Q: Apa yang terjadi kalau saya menghapus siswa dari jadwal yang belum di-approve, padahal siswa itu sudah dipresensi?
A: Meeting history siswa ikut hilang, dan karena journal menempel pada meeting history, **journal juga ikut terhapus**.

Dampaknya: tidak ada jejak bahwa siswa pernah hadir. Teacher harus mengisi ulang journal dari awal jika masih ingat. Jika Report sudah dibuat berdasarkan journal tersebut, Report bisa terpengaruh.

**Status:** Sistem **tidak menampilkan warning apapun** sebelum menghapus. Jadi tanggung jawab sepenuhnya ada di admin — pastikan dulu siswa belum dipresensi sebelum menghapusnya dari jadwal.

**Saran improvement (belum ada):** konfirmasi warning — *"Siswa ini sudah dipresensi. Menghapus siswa akan menghilangkan meeting history dan journal. Lanjutkan?"*

---

#### Q: Apakah replacement teacher bisa mengisi Meeting Journal?
A: **Belum bisa.** Saat ini hanya **Homeroom Teacher** dan **Main Teacher** yang bisa membuat Meeting Journal.

**Rencana ke depan:** replacement teacher akan bisa mengisi Meeting Journal, tapi hanya untuk pertemuan yang dia ajar. Status: *planned, belum diimplementasi* dan masih perlu konfirmasi stakeholder.

**Q: Kalau nanti replacement teacher bisa mengisi journal, apakah journal-nya jadi dobel?**
A: Tidak. Sistem menyimpan **1 journal per meeting**, dan Homeroom Teacher bisa melihat info **last edited by**, sehingga akuntabilitas tetap terjaga. Ini sudah di-handle sistem, bukan risiko.

**Q: Jadi apa yang masih jadi risiko dari rencana itu?**
A: Replacement teacher akan punya **read access ke full learning history** siswa di kelas tersebut, bukan hanya pertemuan yang dia ajar. Ini perlu konfirmasi kebijakan privasi data siswa, terutama untuk segmen sekolah yang guru penggantinya berasal dari luar.

---

#### Q: Kenapa siswa yang absent tetap bisa membuka lesson?
A: Karena **Send Key terkirim ke semua siswa di kelas**, termasuk yang statusnya absent. Siswa yang tidak hadir tetap bisa membuka lesson dengan kunci tersebut.

**Status:** Known issue, sedang diperbaiki.

**Planned fix:** Send Key digabung menjadi satu proses dengan presensi hadir — hanya siswa yang dipresensi hadir yang mendapat kunci otomatis.

---

#### Q: Apakah ada batasan jumlah lesson yang bisa di-unlock manual oleh teacher?
A: **Tidak ada batas.** Teacher bisa membuka lesson siswa secara manual dari CMS (fallback jika lupa Send Key), dan bisa membuka banyak lesson sekaligus dalam 1 pertemuan — padahal 1 pertemuan seharusnya hanya untuk 1 lesson.

**Status:** Known bug.

**Planned fix:** manual unlock dibatasi maksimal **1 lesson per pertemuan**.

---

#### Q: Apakah admin bisa cancel jadwal yang sedang berlangsung (Ongoing)?
A: **Bisa, dan ini berbahaya.** Admin masih bisa cancel jadwal kelas meskipun statusnya Ongoing (teacher sudah klik Start Class). Saat di-cancel, **seluruh presensi dan meeting history siswa yang sudah dipresensi ikut hilang dan tidak bisa di-recover**.

Ini lebih berbahaya daripada kasus hapus siswa dari jadwal, karena bisa terjadi saat kelas sedang berlangsung. Selain itu **tidak ada indikasi visual yang jelas di CMS** bahwa jadwal sedang Ongoing, jadi admin bisa tidak sadar.

**Status:** Tidak ada warning apapun saat ini.

**Saran improvement (belum ada):** blokir tombol cancel untuk jadwal berstatus Ongoing, atau tampilkan warning keras — *"Kelas ini sedang berlangsung. Membatalkan jadwal akan menghapus semua presensi dan meeting history siswa. Lanjutkan?"*

---

### Undocumented Behaviors

#### Q: Kapan kunci (Send Key) yang dikirim ke LMS siswa expired?
A: Kunci expired berdasarkan **jam jadwal kelas selesai**, bukan saat teacher klik Finish Class. Jika teacher Finish Class lebih awal tapi jam jadwal belum lewat, kunci siswa masih aktif dan bisa digunakan.

#### Q: Apa yang terjadi kalau teacher lupa Send Key?
A: Siswa benar-benar tidak bisa membuka lesson (terkunci). Satu-satunya cara adalah manual unlock oleh teacher di CMS — lihat pertanyaan soal batasan manual unlock di atas.

#### Q: Apakah approval presensi bisa dilakukan per siswa?
A: Tidak. Approval dilakukan **per kelas sekaligus**. Jika ada 1 siswa yang perlu dikonfirmasi dulu, seluruh siswa di kelas menunggu sampai admin siap approve semua.

#### Q: Apakah ada batas waktu approval presensi?
A: Tidak ada. Admin bisa approve kapan saja. Selama belum di-approve, **kuota siswa belum berkurang**.

#### Q: Apakah status Paylater mempengaruhi flow presensi?
A: Tidak. Siswa Paylater diperlakukan sama seperti siswa yang sudah bayar dalam hal presensi dan pengurangan kuota.

#### Q: Apakah flow presensi kelas Adaptive dan Group berbeda?
A: Tidak ada perbedaan flow presensi maupun Send Key antara kelas Adaptive dan Group.