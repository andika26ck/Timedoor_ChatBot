# Timedoor ChatBot — Frontend (Paket Lengkap)

Frontend chatbot AI internal Timedoor. **React 18 + TypeScript + Vite 6 + Tailwind CSS 3**.

Paket ini menggabungkan **semua** hasil revisi meeting jadi satu:

- 🌙 **Dark Mode & Light Mode** (mengikuti preferensi sistem, bisa di-toggle, tersimpan di localStorage).
- 💬 **Floating Chat Widget** ala Intercom/Crisp/Zendesk (tombol bulat + panel, bisa diperbesar, full-screen di mobile).
- 📦 **Embeddable** — bisa ditempel ke website lain hanya dengan satu tag `<script>` (Shadow DOM untuk isolasi CSS).
- 📝 **Markdown rendering** untuk jawaban AI (heading, list, tabel, code, bold/italic, link).
- 📄 **Citation** dengan nomor halaman (mis. “Teacher Guide · Hal. 18”).
- 👍👎 **Feedback**, 📋 **Copy**, 🔄 **Retry**, saran topik, “Baca juga”, dan streaming jawaban.
- 🏗️ Struktur folder **feature-based** yang scalable.

> **Tanpa dependency baru.** Semua fitur di atas dibuat tanpa menambah paket npm —
> markdown renderer, toast, ikon, dan util `cn()` ditulis ringan sendiri. Jadi
> cukup `npm install` seperti biasa, tidak ada paket tambahan yang perlu di-approve.

---

## Pakai sebagai library npm (`@timedoor/chatbot-widget`)

Yang dipublish **hanya floating chat widget** — dashboard (Dokumen / Kelola DB /
Templates) tidak ikut ke bundle.

### Build

```bash
npm install
npm run build:lib      # -> dist/index.mjs, dist/index.cjs, dist/index.d.ts, dist/style.css
```

### Install di project lain

```bash
# dari file hasil `npm pack`
npm i ./timedoor-chatbot-widget-0.1.0.tgz
# atau langsung dari GitHub
npm i github:Dhiooo/Timedoor_ChatBot
```

### Pemakaian

```tsx
import { ChatWidget, ThemeProvider } from "@timedoor/chatbot-widget";
import "@timedoor/chatbot-widget/style.css";

// arahkan ke backend FastAPI
(window as any).__TD_CHATBOT_API_URL = "http://localhost:8000";

export default function App() {
  return (
    <ThemeProvider>
      <ChatWidget title="Cobee" subtitle="Ask Cobee Anything!" />
    </ThemeProvider>
  );
}
```

| Prop | Tipe | Default | Keterangan |
|---|---|---|---|
| `title` | `string` | `"Timedoor Assistant"` | Judul di header |
| `subtitle` | `string` | – | Teks kecil di bawah judul |
| `defaultOpen` | `boolean` | `false` | Panel langsung terbuka |
| `showFilter` | `boolean` | `false` | Tampilkan filter domain/topik |

Export lain: `ChatPanel`, `ChatWindow`, `ChatHeader`, `FloatingButton`,
`useTheme`, dan type `ChatMessage`, `FeedbackValue`.

> `react` & `react-dom` adalah **peerDependencies** (v18/v19), jadi tidak ikut
> di-bundle dan tidak akan bentrok dengan React milik host app.

---

## Menjalankan (dashboard + preview widget)

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Widget mengambang muncul di kanan bawah sebagai
live-preview. Untuk cek tampilan tanpa backend, set `VITE_USE_MOCK=true` di `.env`.

Variabel lingkungan (`.env`):

```
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

---

## Build widget embeddable

```bash
npm run build:widget
```

Menghasilkan `dist-widget/widget.js` (satu file, React ikut di-bundle, CSS
di-inline + Shadow DOM). Cara pasang di website mana pun:

```html
<div id="td-chatbot"></div>
<script
  src="https://cdn-anda.com/widget.js"
  data-td-chatbot
  data-api-url="https://api.timedoor.com"
  data-title="Timedoor Assistant"
  data-subtitle="Biasanya balas seketika"></script>
```

Atribut yang didukung: `data-api-url`, `data-title`, `data-subtitle`,
`data-mount-id`, `data-default-open`.

Contoh website host ada di `demo/host.html` (jalankan `npm run build:widget`
dulu, lalu sajikan folder lewat server statis).

---

## Struktur folder

```
src/
  App.tsx                 # dashboard (Chat / Dokumen / Kelola DB) + preview widget
  main.tsx                # entry dashboard (ThemeProvider + ToastProvider)
  widget.tsx              # entry EMBEDDABLE (Shadow DOM)
  index.css               # Tailwind + gaya dark mode & scrollbar
  contexts/
    ThemeContext.tsx      # state tema dark/light
  components/
    ui/                   # komponen lintas fitur tanpa dependency
      MarkdownRenderer.tsx
      ThemeToggle.tsx
      CopyButton.tsx
      FeedbackButtons.tsx
      Toast.tsx
    DocumentsPanel.tsx / SettingsPanel.tsx / TopicPicker.tsx / ...
  features/
    chat/
      index.ts            # barrel export
      types.ts            # ChatMessage, FeedbackValue
      hooks/
        useChat.ts        # SELURUH logika percakapan (state + streaming + retry + feedback)
        useLocalStorage.ts
        useAutoScroll.ts
      components/
        ChatPanel.tsx     # panel chat lengkap (dipakai dashboard & widget)
        MessageList.tsx / MessageBubble.tsx / MessageActions.tsx
        ChatInput.tsx / EmptyState.tsx / TypingIndicator.tsx / ErrorNotice.tsx
        CitationCard.tsx / RelatedDocs.tsx / TopicHintCard.tsx
        DomainTopicFilter.tsx / ScrollToBottomButton.tsx
      widget/
        ChatWidget.tsx    # komponen produk (tombol + jendela)
        FloatingButton.tsx / ChatWindow.tsx / ChatHeader.tsx
  lib/
    api.ts                # klien HTTP (+ sendFeedback, runtime API URL)
    types.ts              # tipe bersama (Citation kini punya `page?`)
    mock.ts
```

---

## Catatan integrasi backend (2 hal opsional)

Frontend sudah aman berjalan tanpa perubahan backend. Dua hal ini opsional dan
hanya mengaktifkan fitur tambahan:

1. **Feedback 👍👎** — frontend mengirim `POST /feedback` secara *fire-and-forget*
   dengan body `{ messageId, value: "up"|"down", question, answer }`. Kalau
   endpoint belum ada, error diabaikan dan UI tetap normal. Tambahkan endpoint
   ini di backend untuk mulai merekam masukan.
2. **Nomor halaman sitasi** — tipe `Citation` kini punya `page?: number | string`.
   Kirim field `page` dari backend agar tampil “Teacher Guide · Hal. 18”.

---

## Prinsip desain kode

- **Feature-based**: semua hal chat ada di `features/chat/`.
- **Pemisahan logika/UI**: `useChat` menyimpan seluruh state; komponen fokus tampilan.
- **Reusable**: `ChatPanel` sama persis dipakai di dashboard dan di dalam widget.
- **Zero-dependency add**: menghormati dependency yang sudah ada; tidak menambah beban bundle.
- **Aksesibilitas**: `aria-label`, fokus keyboard, Esc menutup widget, kontras dark mode.
