# Timedoor Brand Colors — Cara pakai di frontend

Palette diambil dari brand guideline Timedoor Academy.

## Token Tailwind

Didefinisikan di `tailwind.config.js`.

| Token | Hex | Kegunaan |
|---|---|---|
| `brand-600` / `brand` | `#10AF13` | **Primary** — tombol, header widget, aksen utama (>50%) |
| `brand-700` | `#108513` | Hover primary |
| `brand-100` / `brand-50` | tint hijau muda | Background soft, chip |
| `navy` | `#1C2F70` | Judul / teks tegas (secondary, sparingly) |
| `ocean` / `ocean-50` | `#43C4FF` / `#EFF9FF` | Accent info / bg lembut |
| `sunglow` | `#FFD43C` | Accent highlight (≤30%) |
| `blush` | `#FF5D5D` | Error / destructive |
| `dream` | `#D66AFF` | Accent jarang |
| `jet` / `jet-100` | `#353535` / `#F5F5F5` | Teks & background netral |

## Class yang dipakai

```html
<!-- Primary CTA (Do: hijau + putih) -->
<button class="bg-brand-600 hover:bg-brand-700 text-white">Kirim</button>

<!-- Soft surface -->
<div class="bg-brand-50 border border-brand-200 text-brand-800">...</div>

<!-- Judul -->
<h1 class="text-navy">...</h1>

<!-- Error -->
<span class="text-blush">Gagal</span>
```

## Aturan brand (Color Usage)

1. **Primary green** = mayoritas aksen UI
2. **White / Ash** = background
3. **Ocean tint** = optional soft bg
4. **Secondary** (navy/ocean/sunglow/blush/dream) ≤ 30%, jangan overuse
5. Hindari teks hijau di atas hijau (kontras buruk) — pakai **putih di atas brand-600**
