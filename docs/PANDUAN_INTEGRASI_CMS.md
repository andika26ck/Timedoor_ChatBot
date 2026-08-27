# Panduan Integrasi Chatbot "Cobee" untuk Tim CMS

Dokumen ini menjelaskan cara menampilkan floating chat **Cobee** di dalam CMS
Timedoor, dan **meneruskan identitas user yang sedang login di CMS** ke chatbot
secara **aman (server-to-server)** sehingga setiap percakapan tercatat atas nama
user tersebut (bukan "Anonim").

> Ditujukan untuk tim yang punya akses kode/server CMS. Sisi chatbot sudah siap
> menerima identitas ini; yang perlu dikerjakan tinggal di sisi CMS.

---

## 1. Ringkasan arsitektur (Pola Proxy — DIREKOMENDASIKAN)

```
[Browser user yang login di CMS]
        |
        |  (1) widget Cobee kirim pertanyaan ke URL PROXY milik CMS (sama origin)
        v
[Server CMS]  ==>  Endpoint Proxy
        |            menambahkan header rahasia di sisi server:
        |              - X-API-Key: <API key chatbot>
        |              - X-User-Id / X-User-Name / X-User-Email  (dari SESSION login CMS)
        |              - X-Proxy-Secret: <IDENTITY_PROXY_SECRET>
        |  (2) teruskan ke Chatbot API
        v
[Chatbot API (Railway)]  /ask  dan  /ask/stream
        |
        |  (3) jawaban dikembalikan apa adanya ke browser
        v
[Browser]
```

**Kenapa harus lewat proxy server CMS (bukan langsung dari browser)?**

- Secret & API key **tidak pernah muncul di browser** (aman dari inspect element).
- Identitas diambil dari **session login CMS di server**, jadi **tidak bisa
  dipalsukan** oleh user.
- Chatbot hanya mempercayai identitas kalau `X-Proxy-Secret` cocok
  (**fail-closed**): kalau salah / tidak dikirim / secret belum diset, identitas
  diabaikan dan percakapan tercatat sebagai "Anonim".

---

## 2. Nilai yang dibutuhkan (RAHASIA — minta ke Andika)

> Jangan commit nilai asli ke Git dan jangan taruh di kode browser. Simpan
> sebagai environment variable di server CMS.

| Nama | Keterangan | Nilai |
| --- | --- | --- |
| `CHATBOT_API_BASE` | Base URL API chatbot (produksi) | `https://timedoorchatbot-production.up.railway.app` |
| `WIDGET_JS` | URL script widget | `https://timedoor-chat-bot-two.vercel.app/widget.js` |
| `CHATBOT_API_KEY` | API key konsumen `cms-server` (header `X-API-Key`) | `<minta ke Andika>` |
| `IDENTITY_PROXY_SECRET` | Shared secret (harus SAMA PERSIS dengan env di Railway) | `<minta ke Andika>` |

---

## 3. Langkah 1 — Pasang widget di halaman CMS

Tempel snippet ini di layout/halaman CMS tempat chat ingin muncul:

```html
<div id="td-chatbot"></div>
<script src="https://timedoor-chat-bot-two.vercel.app/widget.js"
        data-td-chatbot
        data-api-url="https://cms.timedooracademy.com/cobee-proxy"
        data-title="Cobee"
        data-subtitle="Ask me anything!"></script>
```

**PENTING:**

- `data-api-url` **HARUS menunjuk ke endpoint proxy milik CMS** (Langkah 2),
  BUKAN langsung ke Railway. Widget memanggil beberapa endpoint relatif:
  `/ask`, `/ask/stream`, `/taxonomy`, `/stats/popular`, dan `/feedback` — jadi
  proxy WAJIB meneruskan SEMUANYA (lihat Langkah 2), bukan hanya `/ask`.
- **JANGAN** mengisi `data-api-key` atau `data-user-*` di snippet ini. Atribut
  itu adalah jalur "embed" yang **membocorkan key** ke browser dan **bisa
  dipalsukan**. Identitas & API key disuntikkan di server pada Langkah 2.

---

## 4. Langkah 2 — Buat endpoint proxy di server CMS

Tugas proxy:

1. Menerima request dari widget pada endpoint publik (relatif terhadap
   `data-api-url`): `POST /ask`, `POST /ask/stream`, `GET /taxonomy`,
   `GET /stats/popular`, `POST /feedback`. Endpoint lain WAJIB ditolak
   (allowlist) supaya API key tak bisa dipakai menembak endpoint admin.
2. Mengambil identitas user dari **session login CMS**.
3. Meneruskan ke `CHATBOT_API_BASE` sambil menambahkan header:
   `X-API-Key`, `X-User-Id`, `X-User-Name`, `X-User-Email`, `X-Proxy-Secret`.
4. Mengembalikan respons apa adanya. Untuk `/ask/stream` (SSE), proxy **harus
   streaming / tidak boleh mem-buffer** responsnya.

### Contoh (PHP)

```php
<?php
// Ambil dari environment server CMS (jangan hardcode di repo).
$CHATBOT_BASE = getenv('CHATBOT_API_BASE');      // https://timedoorchatbot-production.up.railway.app
$API_KEY      = getenv('CHATBOT_API_KEY');       // API key cms-server
$PROXY_SECRET = getenv('IDENTITY_PROXY_SECRET');  // sama dengan env Railway

// Identitas dari SESSION login CMS (ganti sesuai sistem auth CMS).
session_start();
$USER_ID    = $_SESSION['user_email'] ?? '';
$USER_NAME  = $_SESSION['user_name']  ?? '';
$USER_EMAIL = $_SESSION['user_email'] ?? '';

// Allowlist endpoint publik yang dipakai widget + method-nya.
$ALLOWED = [
  '/ask'           => ['POST'],
  '/ask/stream'    => ['POST'],
  '/taxonomy'      => ['GET'],   // isi dropdown domain/topik
  '/stats/popular' => ['GET'],   // daftar "Sering ditanyakan"
  '/feedback'      => ['POST'],  // tombol suka / tidak suka
];
$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); // relatif thd data-api-url
$query  = $_SERVER['QUERY_STRING'] ?? '';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if (!isset($ALLOWED[$path])) { http_response_code(404); exit; }
if (!in_array($method, $ALLOWED[$path], true)) { http_response_code(405); exit; }
$isStream = ($path === '/ask/stream');

$hasBody = in_array($method, ['POST', 'PUT', 'PATCH'], true);
$body = $hasBody ? file_get_contents('php://input') : null;
$headers = [
  'X-API-Key: ' . $API_KEY,
  'X-User-Id: ' . $USER_ID,
  'X-User-Name: ' . $USER_NAME,
  'X-User-Email: ' . $USER_EMAIL,
  'X-Proxy-Secret: ' . $PROXY_SECRET,
];
if ($hasBody) { $headers[] = 'Content-Type: application/json'; }

$ch = curl_init($CHATBOT_BASE . $path . ($query !== '' ? ('?' . $query) : ''));
curl_setopt_array($ch, [
  CURLOPT_CUSTOMREQUEST => $method,
  CURLOPT_HTTPHEADER    => $headers,
]);
if ($hasBody) { curl_setopt($ch, CURLOPT_POSTFIELDS, $body); }

if ($isStream) {
  header('Content-Type: text/event-stream');
  header('Cache-Control: no-cache');
  header('X-Accel-Buffering: no'); // matikan buffering nginx
  while (ob_get_level() > 0) { ob_end_flush(); }
  curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $chunk) {
    echo $chunk; flush(); return strlen($chunk);
  });
  curl_exec($ch);
} else {
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $resp = curl_exec($ch);
  http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE) ?: 502);
  header('Content-Type: application/json');
  echo $resp !== false ? $resp : json_encode(['error' => curl_error($ch)]);
}
curl_close($ch);
```

### Contoh (Node / Express)

```js
import express from "express";

const app = express();
const BASE = process.env.CHATBOT_API_BASE;
const API_KEY = process.env.CHATBOT_API_KEY;
const PROXY_SECRET = process.env.IDENTITY_PROXY_SECRET;

// Allowlist endpoint publik yang dipakai widget + method-nya.
const ALLOWED = {
  "/ask": ["POST"],
  "/ask/stream": ["POST"],
  "/taxonomy": ["GET"],          // isi dropdown domain/topik
  "/stats/popular": ["GET"],     // daftar "Sering ditanyakan"
  "/feedback": ["POST"],         // tombol suka / tidak suka
};
// Header hop-by-hop / encoding jangan di-relay (cegah dobel-encoding).
const STRIP = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection",
]);

app.use("/cobee-proxy", express.raw({ type: "*/*" }), async (req, res) => {
  const path = req.path.replace(/\/+$/, "") || "/";
  const methods = ALLOWED[path];
  if (req.method === "OPTIONS") return res.sendStatus(204);
  if (!methods) return res.sendStatus(404);
  if (!methods.includes(req.method)) return res.sendStatus(405);

  const user = req.session?.user ?? {}; // dari session login CMS
  const hasBody = ["POST", "PUT", "PATCH"].includes(req.method);
  const qs = req.originalUrl.includes("?") ? "?" + req.originalUrl.split("?")[1] : "";
  const upstream = await fetch(`${BASE}${path}${qs}`, {
    method: req.method,
    headers: {
      "X-API-Key": API_KEY,
      "X-User-Id": user.email ?? "",
      "X-User-Name": user.name ?? "",
      "X-User-Email": user.email ?? "",
      "X-Proxy-Secret": PROXY_SECRET,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? req.body : undefined,
  });
  res.status(upstream.status);
  upstream.headers.forEach((v, k) => {
    if (!STRIP.has(k.toLowerCase())) res.setHeader(k, v);
  });
  // Untuk SSE, pipe stream tanpa buffering:
  const reader = upstream.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value)); res.flush?.();
  }
  res.end();
});
```

---

## 5. Kontrak API chatbot (referensi)

### Autentikasi
- Semua request WAJIB header `X-API-Key: <CHATBOT_API_KEY>`.

### Header identitas (inti fitur ini)
- `X-User-Id`, `X-User-Name`, `X-User-Email`
- `X-Proxy-Secret` — **wajib**, agar identitas dipercaya.

### Endpoint
- `POST /ask` → respons JSON.
- `POST /ask/stream` → SSE (`text/event-stream`); tiap baris `data: {json}`
  dengan field `type`: `text` | `citations` | `error` | `done`.
- `GET /taxonomy` → daftar domain/topik untuk dropdown.
- `GET /stats/popular?limit=6` → daftar pertanyaan "Sering ditanyakan".
- `POST /feedback` → kirim rating jawaban (tombol suka / tidak suka).
- `GET /health` → cek status.

### Body (JSON)
```json
{
  "question": "Bagaimana cara reset password?",
  "session_id": "buat-1-id-unik-per-user-atau-sesi",
  "domain": null,
  "topic": null,
  "history": [
    { "role": "user", "text": "halo" },
    { "role": "assistant", "text": "Halo, ada yang bisa dibantu?" }
  ]
}
```

> Catatan: field `user_id` / `user_name` / `user_email` di **body** adalah jalur
> "embed" (kurang aman, bisa dipalsukan dari browser). Untuk pola proxy,
> **gunakan HEADER `X-User-*`** dan biarkan field body kosong.

---

## 6. Keamanan (wajib)

- `X-Proxy-Secret` & `X-API-Key` hanya ada di **server CMS** (environment
  variable), tidak pernah dikirim ke browser.
- Gunakan HTTPS di semua sisi.
- Jangan menaruh secret di HTML/JS, repo publik, atau atribut `data-*` widget.

---

## 7. Verifikasi setelah integrasi

1. Login sebagai user di CMS, buka floating chat, kirim pertanyaan.
2. Buka dashboard chatbot → **Riwayat & Log** → **Percakapan Pengguna**.
3. Percakapan harus muncul dengan **nama/email user** (bukan "Anonim").

---

## 8. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
| --- | --- | --- |
| `401 Unauthorized` | `X-API-Key` salah / tidak dikirim | Pastikan proxy mengirim API key yang benar |
| `429 Too Many Requests` | Kena rate limit | Coba lagi beberapa saat |
| Tercatat "Anonim" | `X-Proxy-Secret` tidak cocok / tidak dikirim, `X-User-*` kosong, atau `IDENTITY_PROXY_SECRET` beda dengan Railway | Samakan secret di CMS & Railway; pastikan header identitas terisi |
| Jawaban stream terputus / muncul sekaligus di akhir | Proxy mem-buffer SSE | Matikan buffering (lihat `X-Accel-Buffering: no` + `flush()`) |
| "Sering ditanyakan" & dropdown domain kosong di CMS | Proxy hanya meneruskan `/ask` & `/ask/stream` | Tambahkan `/taxonomy`, `/stats/popular`, `/feedback` ke allowlist proxy |
