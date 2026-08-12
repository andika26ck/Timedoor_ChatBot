---
judul: System Rules & Undocumented Behaviors
kategori: RULES
domain: System Rules
label: [status-siswa, session, renew, drop, postpone, learning-history, lock-unlock, currency, analytic, quota-teacher, eskalasi]
dokumen_terkait: [knownrisks_01_known-risks.md, cms_04_session-management.md, teacher_07_create-meeting-journal.md]
sumber_asli: Notion — Academy LMS Knowledge Base > System Rules & Undocumented Behaviors (kompilasi diskusi WhatsApp Dewa + Bimo, Jul 2025 – Jun 2026)
terakhir_update: 2026-06-30
---

# System Rules & Undocumented Behaviors

## Ringkasan
Kumpulan aturan sistem Academy LMS, edge case, dan perilaku yang belum terdokumentasi di SOP per role. Mencakup logika status siswa & session, learning history, lock/unlock, tipe event, redeem, currency, perhitungan analytic, book management, quota teacher, protokol eskalasi support, dan protokol update guidelines.

---

## 1. Status Siswa & Session Logic

### Prioritas status
Urutan prioritas: **Ongoing > Idle > Postponed > Drop**.
Yang dilihat sistem adalah **action terakhir**. Drop dan Postpone setara — jika siswa punya session Drop dan Postpone, yang tampil adalah yang terakhir terjadi.

### Drop
- Drop adalah **end state**. Jika siswa membeli lagi setelah Drop, terbentuk **session baru**, bukan melanjutkan session lama.
- Drop + Renew (produk sama / session sama) → status menjadi **Idle**.

### Postponed (Manual)
- Jika siswa di-manual postpone, setelah renew statusnya menjadi **Idle** (tidak otomatis Ongoing).
- Admin harus menekan tombol **Activate Session** secara manual untuk mengubah ke Ongoing.
- Best practice: **Activate session dulu, baru Renew.**

### Postponed (System)
- System postpone terjadi jika session memiliki **0 meeting selama beberapa hari berturut-turut**.
- Begitu renew berhasil di-paid → **otomatis kembali Ongoing**.
- Treatment berbeda dengan Manual Postpone.

### Expired
- Expired + Renew → status menjadi **Idle**.

### Renew (produk & session sama)
- Status setelah renew → **Idle**, tidak langsung Ongoing.
- Hasil test di produksi: Ongoing → Manual Postpone → Renew same product & session → Idle.

---

## 2. Learning History Rules

### Log yang muncul saat renew

| Kondisi | Log 1 | Log 2 |
| --- | --- | --- |
| Postponed + Renew | Session Resume | Product Changed (hanya jika produk berubah) |
| Expired + Renew | Seharusnya Session Resume | Product Changed (hanya jika produk berubah) |
| Drop + Renew | New Session Register | — |

### Catatan penting
- **Session Resume** muncul untuk Postponed yang di-renew, tetapi status session **tidak otomatis Ongoing** (tetap Postponed sampai admin Activate manual).
- **Product Changed** hanya muncul jika produk/package benar-benar berubah. Renew kuota dengan produk sama → log ini tidak ditampilkan.
- Expired saat ini menampilkan **New Session Register**; usulan agar disamakan menjadi **Session Resume** supaya konsisten dengan Postponed.

---

## 3. Lock / Unlock Behavior

| Action | Via Tools (manual) | Via System (otomatis) |
| --- | --- | --- |
| Unlock | Progres menjadi **100%** | Progres **tidak berubah** |
| Lock | Progres menjadi **0%** | Progres menjadi **0%** |

Reset progres ke 100% saat Unlock hanya berlaku jika dilakukan melalui TOOLS, bukan oleh sistem.

---

## 4. Event & Class Type Definitions

| Type | Behavior | Durasi | Quota |
| --- | --- | --- | --- |
| Trial | Tidak ada rule khusus, hanya pengkategorian | Bisa > 1 hari | — |
| Workshop | Tidak ada rule khusus, hanya pengkategorian | Bisa > 1 hari | Quota workshop masih 5 |
| Bootcamp | Tidak ada rule khusus, hanya pengkategorian | Bisa > 1 hari | — |
| Extra Class / Bimbingan | Diperlakukan sama dengan Workshop | Bisa > 1 hari | — |

Trial, Workshop, dan Bootcamp tidak punya perbedaan perilaku di sistem — hanya pengkategorian. Extra Class hanya butuh nama baru, rule-nya mengikuti Workshop.

---

## 5. Redeem & Pending Product
- Aturan Redeem & Pending Product mengikuti tiket Plane **MICRO-2963** (https://app.plane.so/microdemy/browse/MICRO-2963/).
- Product yang dibeli saat siswa masih punya meeting aktif di produk lain masuk ke Pending Product dan harus di-**Redeem** admin sebelum bisa dipakai.

---

## 6. Currency Rules

| Country | Currency |
| --- | --- |
| Indonesia (ID) | IDR |
| Malaysia (MY) | MYR |
| Egypt | EGP |

- Currency ditentukan **otomatis berdasarkan Country di Branch** — tidak perlu field Currency tambahan di Master Data.
- Jika field Currency ditambahkan di Branch, fungsinya **hanya mengganti teks display** (IDR/MYR/EGP) di card.
- **Jangan dihubungkan ke perhitungan invoice** — invoice sudah memakai currency yang benar.
- Lokasi yang perlu diupdate: Card Invoice, Card Paylater, Card Analytic.

---

## 7. Analytic Calculation Rules

### Movement antar status (Drop ↔ Idle)

| Rule | Case | Dihitung? |
| --- | --- | --- |
| Rule 1 | Drop bulan lalu → Idle bulan ini | TIDAK dihitung (mencegah counter minus) |
| Rule 2 | Drop bulan ini → Idle bulan ini | TETAP dihitung sebagai pengurang, supaya counter kembali ke 0 |

### Perhitungan
- Semua metric dihitung **per `session_id`**, bukan per `student_id`. Jika 1 siswa punya 2 session di package yang sama → dihitung 2x.
- **Snapshot data di akhir bulan** — angka final bulan tersebut dikunci.
- Data refresh minimal harian (06:00 AM branch time).

### Export
- Export mengikuti **bulan aktif** di halaman.
- Format nama file: `Student_Analytic_[Bulan]_[Tahun].xlsx` (contoh: `Student_Analytic_June_2026.xlsx`).
- Filter grade tidak diperlukan — semua grade masuk ke tabel export.

---

## 8. Book Management Rules

### Package duplikat
- Package duplikat akibat kesalahan user cukup **di-inactive-kan**, tidak perlu dihapus.
- Customer lama yang sudah order tetap aman (sudah dites).
- Customer baru otomatis hanya bisa order package versi yang benar.

### Book Settings summary
- Checklist dicentang → tampil ✅
- Checklist tidak dicentang → tampil ❌
- Setting dicentang tapi nilainya kosong (contoh GForm URL kosong) → tampil **0**

---

## 9. Teacher Quota Calculation
- Quota dihitung berdasarkan **jumlah block class** milik teacher. Contoh: 12 block class → quota 12 sesi.
- Kehadiran dihitung dari flag attendance di database (hadir/tidak hadir).

### Edge case
Jika siswa selesai di meeting ke-5 dari total 12:
- Meeting ke-6 sampai ke-12 **tetap dihitung** sebagai teacher hadir.
- Sistem tetap menganggap teacher memiliki 12 sesi penuh.
- Meskipun kelasnya tidak pernah berlangsung.

---

## 10. System Support Escalation Protocol

### Alur eskalasi
1. Cek Knowledge Base terlebih dahulu — gunakan solusi yang sudah terdokumentasi.
2. Jika tidak ada solusi, kumpulkan detail lengkap: kronologi, screenshot/recording, data pengguna, langkah pemicu error.
3. Komunikasikan ke tim teknis (System Team) secara terstruktur.
4. Pantau progres isu yang dieskalasi.
5. Update pengguna secara proaktif hingga masalah tuntas.

### SLA & response
- Standby dan responsif di WhatsApp.
- Jawaban harus jelas, sopan, dan akurat sesuai SOP & SLA.
- Semua laporan dicatat ke sistem tiket / Google Sheet.
- Insight UX dan feedback pengguna disampaikan ke Product Team.

---

## 11. Guidelines Update Protocol
- Setiap rilis fitur baru, guidelines **harus diupdate sebelum rilis** (target H-2 atau H-1).
- Training user dilakukan setelah guidelines diupdate.
- Fitur besar (contoh: Order Revamp, Attendance) **wajib refreshment/training** karena admin bisa kaget dengan UI baru.
- Untuk rilis besar, beri jeda 1–2 hari setelah rilis sebelum training, dan hindari hari libur.

---

## Referensi
- Renew tanpa Redeem Rules — Notion
- Redeem Ticket — Plane MICRO-2963
- Learning History Testing (Staging) — Notion
