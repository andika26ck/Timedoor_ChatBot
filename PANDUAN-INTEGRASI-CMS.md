# Panduan Integrasi CMS ↔ Timedoor FAQ Bot (Cobee) API

> Dokumen ini menggantikan “test widget”. Isinya adalah **kontrak API** yang perlu
> disiapkan tim CMS (tim lain) agar chatbot bisa dipasang di CMS dengan aman dan
> setiap percakapan tercatat identitasnya.
>
> **Base URL (produksi):** `https://timedoorchatbot-production.up.railway.app`

---

## 0. Ringkasan Cepat (TL;DR)

Untuk tim CMS, ada **3 hal wajib**:

1. **Buat endpoint proxy di server CMS** (mis. `proxy.php`). Browser TIDAK boleh
   memanggil API chatbot langsung, karena ada 2 rahasia yang harus tetap di server:
   - `COBEE_API_KEY` → dikirim sebagai header `X-API-Key`
   - `IDENTITY_PROXY_SECRET` → dipakai untuk menandatangani identitas user
2. **Kirim data identitas (primary) user** pada setiap request, dalam bentuk
   **token bertanda tangan** `X-Identity-Token` (JWT HS256). Wajib berisi
   `sub` (ID user yang unik & stabil), `name`, `email`.
3. **Wajib login.** Percakapan tanpa identitas akan **ditolak `401`** (mode anonim
   dinonaktifkan — semua chat harus tercatat).

Dua rahasia (`COBEE_API_KEY` dan `IDENTITY_PROXY_SECRET`) akan **kami berikan
terpisah** dan nilainya harus **sama persis** dengan yang ada di server chatbot.

---

## 1. Arsitektur: kenapa harus pakai proxy?

```
 Browser user (di CMS)                Server CMS (tim lain)               Server Chatbot (kami / Railway)
 ────────────────────                ───────────────────              ────────────────────────
  widget chat  ──POST /ask──▶  proxy.php (server-side):          ─────────▶  verifikasi X-API-Key
  (tanpa key)                     + tambah  X-API-Key (rahasia)              + verifikasi X-Identity-Token
                                  + tanda tangani identitas  ──────────▶    (JWT) pakai IDENTITY_PROXY_SECRET
                                    jadi JWT X-Identity-Token               + proses + catat log identitas
```

**Prinsip:** rahasia (`X-API-Key`) dan secret tanda tangan hanya hidup di server
CMS. Browser hanya bicara ke server CMS sendiri, jadi user tidak pernah bisa
melihat/mencuri kredensial dari tab Network.

---

## 2. Checklist yang harus disiapkan tim CMS

- [ ] Endpoint **proxy server-side** yang meneruskan request ke Base URL di atas.
- [ ] Simpan 2 env/secret di server CMS: `COBEE_API_KEY`, `IDENTITY_PROXY_SECRET`.
- [ ] Ambil identitas user dari **session login CMS** (bukan dari input browser).
- [ ] Pada tiap request, **buat + tanda tangani JWT** berisi `sub`, `name`, `email`,
      lalu kirim sebagai header `X-Identity-Token`.
- [ ] Kirim juga `X-API-Key` (dari `COBEE_API_KEY`).
- [ ] Teruskan **body JSON** dari widget apa adanya (lihat §5).
- [ ] Pastikan **jam server sinkron (NTP)** — token berumur pendek (120 detik).
- [ ] Hanya izinkan path yang diperlukan (allowlist): `/ask`, `/ask/stream`,
      `/taxonomy`, `/stats/popular`, `/feedback`.
- [ ] Tangani **HTTP 401** (user belum login) di sisi UI (mis. minta login dulu).

---

## 3. Data identitas (primary) yang WAJIB dikirim

Inilah jawaban langsung untuk pertanyaan mentor soal **“primary data”**:

| Field   | Wajib | Ini “primary key”? | Keterangan |
|---------|:-----:|:------------------:|------------|
| `sub`   | ✅ Ya | **Ya — kunci utama** | ID user CMS yang **unik & stabil sepanjang waktu**. Dipakai untuk mengenali “ini user yang sama” antar hari/percakapan. **Jangan** pakai nilai yang bisa berubah. |
| `name`  | ✅ Ya | Tidak | Nama tampilan untuk label di riwayat admin. |
| `email` | ✅ Ya | Tidak | Email user; label tambahan + fallback identitas. |

**Penting soal `sub`:**
- `sub` = **primary key user** di sisi chatbot. Gunakan **ID internal CMS**
  (mis. `user_id` di database CMS), karena itu paling stabil.
- Kalau CMS memakai email sebagai ID dan email bisa diganti user, lebih aman
  tetap kirim ID internal sebagai `sub`, dan email hanya di field `email`.
- Nilai `sub` yang sama = dianggap user yang sama, walau beda hari/sesi.

> Catatan: mode **anonim dihapus**. Kalau `sub` (dan name/email) kosong semua,
> request ditolak `401`. Jadi user harus login di CMS sebelum bisa chat.

---

## 3.1 Arti `sub`, siapa yang membuat, & identitas lintas waktu

### Apa itu `sub`/`id` di sini? (karena "id" bisa banyak arti)

`sub` = singkatan **"subject"** pada standar JWT = "token ini tentang siapa".
Di konteks kita, `sub` berarti **ID user di database CMS** — yaitu *primary key*
tabel user milik CMS (mis. kolom `users.id = 12345`). Nilai ini **tetap seumur
hidup akun** user tersebut.

Supaya tidak tertukar, berikut berbagai "id" yang ada di sistem dan mana yang dimaksud:

| "id" | Milik siapa | Dipakai untuk | Ini `sub`? |
|------|-------------|---------------|:----------:|
| **ID user CMS** (PK tabel user CMS, mis. `12345`) | Database CMS | Identitas user lintas waktu di chatbot | ✅ **Ya, ini yang dimaksud** |
| Username akun chatbot (email) | Tabel akun chatbot | Login langsung ke dashboard/chatbot | ❌ |
| `session_id` (`sess-YYYY-MM-DD-<uuid>`) | Dibuat di browser | Mengelompokkan satu percakapan | ❌ |
| `messageId` | Frontend | Umpan balik per-pesan (up/down) | ❌ |
| String token JWT | Dibuat proxy | Kredensial sesaat (bukan id) | ❌ |

### Siapa yang membuat `sub`? **CMS**, bukan chatbot.

- `sub` **dibuat oleh CMS** saat user mendaftar/di-*create* di CMS. Itu adalah id
  internal CMS sendiri.
- **Chatbot TIDAK membuat/menghasilkan id apa pun untuk user CMS.** Chatbot juga
  **tidak membuat akun** untuk user CMS. Ia hanya **menyimpan nilai `sub` apa
  adanya** sebagai label di log percakapan (kolom `user_id`).
- Jadi untuk user CMS, **tidak ada "id versi chatbot" yang terpisah**. Id yang
  dipakai di chatbot = persis `sub` yang dikirim CMS.

### "User benar-benar baru" — bagaimana alurnya?

Misal user baru daftar di CMS (belum pernah menyentuh chatbot sama sekali):

1. CMS membuat user itu di database-nya → dapat `users.id = 6789` (PK CMS).
2. User bertanya di chatbot lewat CMS → proxy menandatangani token berisi
   `sub = "6789"`.
3. Chatbot menerima token, verifikasi tanda tangan, lalu **mencatat log dengan
   `user_id = 6789`**. Selesai — chatbot "mengenal" user ini apa adanya.

**CMS tidak perlu menanyakan id ke chatbot**, karena chatbot memang tidak punya
id sendiri untuk user CMS. CMS cukup memakai id-nya sendiri.

### "Apakah bisa nabrak dengan id yang sudah ada di chatbot?"

Praktis **tidak**, dengan alasan berikut:

- Kolom `user_id` di log chatbot hanya **teks bebas tanpa batasan unik** — jadi
  **tidak mungkin muncul error "id bentrok"** saat menyimpan.
- Id user CMS **sudah dijamin unik oleh CMS** (karena itu primary key di CMS), dan
  **hanya ada satu CMS** yang terhubung → tidak ada dua user berbeda dengan `sub`
  yang sama.
- Namespace-nya beda: akun **login langsung chatbot** memakai **email** sebagai id
  (`budi@...`), sedangkan **user CMS** memakai **id numerik** (`6789`). Keduanya
  tidak akan bertabrakan selama **`sub` bukan berupa email**.

**Satu syarat penting** agar aman: **jangan pakai email sebagai `sub`** (email bisa
diganti + bisa menyerupai id akun chatbot). Pakai id numerik/opaque internal CMS.
Dan **jangan daur ulang id** bekas user yang dihapus — kalau id dipakai ulang untuk
user baru, riwayat lama bisa "menempel" ke user baru.

### Identitas lintas waktu: kenapa besok tetap dikenali sebagai user yang sama

| Hal | Berubah tiap request? | Perannya |
|-----|:---:|----------|
| `X-Identity-Token` (JWT) | ✅ selalu baru | Bukti keaslian **sesaat** (anti-palsu, anti-replay) |
| **`sub`** | ❌ tetap | **Penyambung identitas antar hari** (primary key) |
| `session_id` | ganti per percakapan | Hanya mengelompokkan **satu** percakapan |

Contoh: hari ini token **A** (`sub=6789`), besok token **B** yang berbeda total —
**tapi `sub` di keduanya sama `6789`**. Karena itu chatbot tahu "ini user yang
sama yang kemarin bertanya". Yang menyambungkan **hanya `sub`**, bukan token dan
bukan `session_id` (yang tanggalnya saja sudah beda tiap hari).

> Ringkas untuk tim CMS: **kirim `sub` = ID user internal CMS yang tetap & tidak
> pernah didaur ulang, di setiap token, apa pun harinya.** Itulah satu-satunya
> data yang memverifikasi "ini user yang sama".

---

## 4. Autentikasi

Ada **dua lapis** yang harus dikirim proxy pada tiap request:

### 4.1 API key aplikasi — header `X-API-Key`
- Nilainya dari env `COBEE_API_KEY` (kami berikan).
- Membuktikan bahwa yang memanggil adalah **aplikasi CMS resmi**, bukan sembarang orang.
- **Hanya boleh dikirim dari server** (jangan pernah taruh di HTML/JS browser).

### 4.2 Identitas user — header `X-Identity-Token` (JWT HS256)
Token bertanda tangan (signed token) yang membuktikan **siapa user-nya**, tanpa
mengirim secret mentah di kabel.

**Algoritma:** `HS256` (HMAC-SHA256).
**Secret tanda tangan:** `IDENTITY_PROXY_SECRET` (kami berikan; sama persis dgn server).
**Struktur JWT:** `base64url(header) . base64url(payload) . base64url(signature)`

**Header:**
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload (klaim):**
```json
{
  "sub":   "12345",                 // WAJIB: ID user unik & stabil (primary key)
  "name":  "Budi Santoso",          // WAJIB: nama tampilan
  "email": "budi@contoh.com",       // WAJIB: email user
  "iat":   1788492711,              // issued-at (epoch detik)
  "exp":   1788492831               // expiry = iat + 120 detik (token pendek)
}
```

**Signature:**
```
signature = HMAC_SHA256( base64url(header) + "." + base64url(payload), IDENTITY_PROXY_SECRET )
```

**Aturan penting:**
- `exp` sebaiknya **pendek** (kami pakai 120 detik). Buat token **baru tiap request**.
- Karena `exp` pendek, **jam server CMS harus sinkron (NTP)**, kalau tidak token
  dianggap kedaluwarsa.
- Secret tidak pernah dikirim — yang dikirim hanya hasil tanda tangannya.
- Base64 yang dipakai adalah **base64url tanpa padding** (`+`→`-`, `/`→`_`, buang `=`).

> Backend juga masih menerima cara lama (header `X-User-Id/Name/Email` +
> `X-Proxy-Secret`) **sementara** untuk transisi tanpa downtime, tapi cara itu
> akan **dihapus**. Untuk integrasi baru, **pakai `X-Identity-Token`**.

---

## 5. Referensi Endpoint

Semua endpoint chat di bawah bersifat publik untuk end-user (tidak butuh token
admin), tapi **wajib** membawa `X-API-Key` + identitas (`X-Identity-Token`).

### 5.1 `POST /ask` — tanya jawab (non-streaming)

**Request body (JSON):**
```json
{
  "question": "Bagaimana cara reset password?",   // WAJIB, tidak boleh kosong
  "domain": null,          // opsional: batasi ke satu domain, mis. "HR". null = semua
  "topic": null,           // opsional: batasi ke satu label topik. null = semua
  "history": [             // opsional: beberapa giliran terakhir (multi-turn)
    { "role": "user",      "text": "Halo" },
    { "role": "assistant", "text": "Halo, ada yang bisa dibantu?" }
  ],
  "session_id": "sess-2026-09-04-a1b2c3d4"  // opsional tapi disarankan, lihat §6
}
```
> Field `user_id`/`user_name`/`user_email` di body **tidak dipakai untuk auth**
> (hanya sisa lama untuk pelabelan). Identitas yang dipercaya diambil dari
> `X-Identity-Token`. Boleh dikosongkan.

**Response 200 (JSON):**
```json
{
  "answer": "Untuk reset password, buka menu ...",
  "citations": [
    { "source": "Panduan Akun.pdf", "snippet": "...", "page": 18 }
  ],
  "related_docs": [
    { "source": "FAQ Login.pdf", "domain": "Akun" }
  ]
}
```

### 5.2 `POST /ask/stream` — tanya jawab (streaming / SSE)

Body **sama** dengan `/ask`. Respons berupa **Server-Sent Events**
(`Content-Type: text/event-stream`). Tiap baris berbentuk `data: {json}` dengan
field `type`:

| `type`      | Arti |
|-------------|------|
| `text`      | Potongan jawaban; `value` (string) ditambahkan ke layar. |
| `citations` | Daftar sitasi (dikirim sekali, biasanya di akhir). |
| `error`     | Gagal; `value` sudah berupa pesan ramah user. |
| `done`      | Stream selesai sukses. |

Contoh potongan stream:
```
data: {"type":"text","value":"Untuk reset "}
data: {"type":"text","value":"password..."}
data: {"type":"citations","value":[{"source":"Panduan Akun.pdf","page":18}]}
data: {"type":"done"}
```
> Catatan: pada mode stream, error **tidak** dikirim sebagai HTTP status (karena
> status sudah terkunci saat byte pertama terkirim), melainkan sebagai event
> `{"type":"error"}`. Cek 401 (identitas wajib) tetap terjadi **sebelum** stream
> dimulai, jadi user belum login akan tetap dapat `401` biasa.

### 5.3 `GET /taxonomy` — daftar kategori/domain/topik (untuk dropdown)
```json
{
  "categories": ["..."],
  "domains": ["HR", "Akun", "..."],
  "topics": ["Cuti", "Login", "..."],
  "topics_by_domain": { "HR": ["Cuti", "Lembur"], "Akun": ["Login"] }
}
```

### 5.4 `GET /stats/popular?limit=6` — pertanyaan sering ditanyakan
```json
[
  { "question": "Bagaimana cara reset password?", "count": 42 },
  { "question": "Berapa hari cuti tahunan?",       "count": 30 }
]
```
`limit` opsional (default `6`). Cocok untuk empty-state / “chip” saran pertanyaan.

### 5.5 `POST /feedback` — umpan balik jawaban (up/down)
**Request:**
```json
{
  "messageId": "abc-123",   // ID pesan di sisi frontend
  "value": "up",            // "up" atau "down"
  "question": "...",        // opsional
  "answer": "..."           // opsional
}
```
**Response:** `{ "status": "ok", "value": "up" }`

---

## 6. `session_id` — pengelompokan percakapan

- String opaque untuk mengelompokkan pesan-pesan dalam **satu percakapan**.
- **Siapa yang membuat:** dibuat di sisi klien (widget), lalu dikirim di body.
- **Format yang dipakai widget saat ini:** `sess-YYYY-MM-DD-<uuid>`
  (contoh: `sess-2026-09-04-3f9a...`).
- **Aturan pemakaian:** pakai **nilai yang sama** untuk semua pesan dalam satu
  percakapan; ganti hanya saat user memulai percakapan baru.
- `session_id` **bukan** identitas/auth — hanya untuk pengelompokan log. Identitas
  tetap dari `X-Identity-Token`.

---

## 7. Kebijakan wajib-login (mode anonim dinonaktifkan)

- Setiap `POST /ask` dan `POST /ask/stream` **wajib** membawa identitas valid.
- Kalau tidak ada identitas (token tidak dikirim / tidak valid / kedaluwarsa),
  backend mengembalikan:
  ```json
  HTTP 401
  { "detail": "Identitas wajib: percakapan anonim tidak diizinkan. Login akun atau akses lewat CMS terautentikasi (proxy)." }
  ```
- **Implikasi untuk CMS:** pengunjung yang **belum login** tidak bisa chat.
  Sarankan: sembunyikan/kunci widget sampai user login, atau tampilkan ajakan login
  saat menerima `401`.

---

## 8. Contoh implementasi proxy

### 8.1 PHP (menandatangani JWT + meneruskan request)
```php
<?php
// ==== Rahasia (dari env server, JANGAN di browser) ====
$API_KEY       = getenv('COBEE_API_KEY');        // -> header X-API-Key
$PROXY_SECRET  = getenv('IDENTITY_PROXY_SECRET'); // -> secret tanda tangan JWT
$BACKEND       = 'https://timedoorchatbot-production.up.railway.app';

// ==== Ambil identitas dari SESSION login CMS (bukan dari input browser) ====
session_start();
$u = $_SESSION['user'] ?? null;
if (!$u) { http_response_code(401); echo json_encode(['detail' => 'Belum login']); exit; }

function b64url($raw) { return rtrim(strtr(base64_encode($raw), '+/', '-_'), '='); }

function sign_identity_token($secret, $sub, $name, $email) {
  $now = time();
  $header  = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
  $payload = b64url(json_encode([
    'sub'   => (string)$sub,
    'name'  => $name,
    'email' => $email,
    'iat'   => $now,
    'exp'   => $now + 120,
  ], JSON_UNESCAPED_UNICODE));
  $sig = b64url(hash_hmac('sha256', "$header.$payload", $secret, true));
  return "$header.$payload.$sig";
}

$token = sign_identity_token($PROXY_SECRET, $u['id'], $u['name'], $u['email']);

// ==== Teruskan request widget apa adanya ====
$path = $_GET['path'] ?? '/ask';           // allowlist di produksi!
$body = file_get_contents('php://input');

$ch = curl_init("$BACKEND$path");
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_POSTFIELDS     => $body,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER     => [
    'Content-Type: application/json',
    'X-API-Key: ' . $API_KEY,
    'X-Identity-Token: ' . $token,
  ],
]);
$resp = curl_exec($ch);
http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE));
header('Content-Type: application/json');
echo $resp;
```

### 8.2 Node.js (Express) — hanya bagian tanda tangan token
```js
const crypto = require("crypto");
const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function signIdentityToken(secret, { sub, name, email }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: String(sub), name, email, iat: now, exp: now + 120 }));
  const sig = b64url(crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}
// kirim: headers { "X-API-Key": COBEE_API_KEY, "X-Identity-Token": token }
```

---

## 9. Contoh uji cepat dengan curl

```bash
# Ganti <API_KEY> dan <IDENTITY_TOKEN> (token bisa dibuat oleh proxy).
curl -s https://timedoorchatbot-production.up.railway.app/ask \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <API_KEY>' \
  -H 'X-Identity-Token: <IDENTITY_TOKEN>' \
  -d '{"question":"Bagaimana cara reset password?","session_id":"sess-test-1"}'

# Tanpa identitas -> harus 401
curl -i https://timedoorchatbot-production.up.railway.app/ask \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <API_KEY>' \
  -d '{"question":"halo"}'
```

---

## 10. Kode status & error

| Status | Arti | Yang harus dilakukan CMS |
|-------:|------|--------------------------|
| `200`  | Sukses | Tampilkan `answer` + `citations`. |
| `401`  | Identitas wajib / token tidak valid / kedaluwarsa | Minta user login; buat ulang token; cek jam server (NTP) & `IDENTITY_PROXY_SECRET`. |
| `403`  | `X-API-Key` salah/kurang | Cek env `COBEE_API_KEY`. |
| `422`  | Body tidak valid (mis. `question` kosong) | Validasi input sebelum kirim. |
| `429`  | Terlalu banyak request (rate limit) | Backoff / coba lagi nanti. |
| `5xx`  | Error server | Coba lagi; laporkan bila menetap. |

---

## 11. Checklist QA sebelum go-live

- [ ] Request dari user **login** → `200`, dan di dashboard admin nama muncul (bukan “Anonim”).
- [ ] Request **tanpa** identitas → `401`.
- [ ] Token dengan `IDENTITY_PROXY_SECRET` **salah** → `401`.
- [ ] Token **kedaluwarsa** (jam server meleset) → `401` → pastikan NTP aktif.
- [ ] `X-API-Key` tidak ada / salah → `403`.
- [ ] Di tab Network browser: **tidak ada** `X-API-Key` / secret / `X-Identity-Token`
      (semuanya ditambahkan server-side).
- [ ] `session_id` konsisten dalam satu percakapan; ganti saat mulai percakapan baru.
- [ ] Streaming (`/ask/stream`) tampil bertahap dan diakhiri event `done`.

---

## 12. Keamanan — lakukan & hindari

**Lakukan**
- Simpan `COBEE_API_KEY` & `IDENTITY_PROXY_SECRET` sebagai **env server** saja.
- Ambil identitas dari **session login server**, bukan dari parameter yang bisa
  dimanipulasi browser.
- Buat token **baru tiap request** dengan `exp` pendek.
- Batasi path proxy dengan **allowlist**.

**Hindari**
- ❌ Menaruh API key / secret di HTML, JS, atau atribut `data-*` widget.
- ❌ Membiarkan browser mengirim identitas mentah (bisa dipalsukan user).
- ❌ Memakai `exp` panjang atau token statis yang dipakai ulang lama.
- ❌ Mengekspos endpoint proxy tanpa allowlist (bisa jadi open proxy).

---

## 13. Ringkasan variabel lingkungan (server CMS)

| Env | Dipakai untuk | Catatan |
|-----|---------------|---------|
| `COBEE_API_KEY` | Header `X-API-Key` | Sama persis dgn server chatbot. |
| `IDENTITY_PROXY_SECRET` | Menandatangani JWT `X-Identity-Token` | Sama persis dgn server chatbot. Rahasiakan. |
| `BACKEND_URL` (opsional) | Base URL chatbot | `https://timedoorchatbot-production.up.railway.app` |

---

### Lampiran: ringkasan header tiap request chat

```
POST /ask  (atau /ask/stream)
Content-Type:     application/json
X-API-Key:        <COBEE_API_KEY>          # membuktikan aplikasi resmi
X-Identity-Token: <JWT HS256>              # membuktikan siapa user-nya (sub/name/email)

Body: { "question": "...", "session_id": "...", "domain": null, "topic": null, "history": [] }
```

*Dokumen ini dibuat berdasarkan kode backend `main.py` / `schemas.py` / `auth.py`
yang berlaku saat ini. Jika ada perubahan kontrak, versi dokumen ini perlu
diperbarui.*
