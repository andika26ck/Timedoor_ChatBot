/**
 * Entry point EMBEDDABLE.
 *
 * Build (lib mode) menghasilkan satu file `widget.js` yang bisa ditempel di
 * website mana pun:
 *
 *   <div id="td-chatbot"></div>
 *   <script src="https://cdn.anda.com/widget.js"
 *           data-api-url="https://api.timedoor.com"
 *           data-title="Cobee"></script>
 *
 * Widget dirender di dalam Shadow DOM agar CSS-nya terisolasi dari halaman host.
 *
 * CATATAN IDENTITAS (PENTING):
 * Identitas user (nama/email) TIDAK dikirim dari browser. Untuk embed di CMS /
 * web lain, identitas di-inject SERVER-SIDE oleh proxy CMS lewat header
 * X-User-* + X-Proxy-Secret (lihat docs/PANDUAN_INTEGRASI_CMS.md). Karena itu
 * widget ini sengaja TIDAK lagi membaca data-user-* / window.__TD_CHATBOT_USER_*
 * (jalur browser gampang dipalsukan dan sudah tidak dipercaya backend).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChatWidget } from "./features/chat/widget/ChatWidget";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./components/ui/Toast";
import cssText from "./index.css?inline";

type WidgetConfig = {
  apiUrl?: string;
  apiKey?: string;
  title?: string;
  subtitle?: string;
  mountId?: string;
  defaultOpen?: boolean;
};

function readConfig(): WidgetConfig {
  const el =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>("script[data-td-chatbot]") ??
    null;
  const d = el?.dataset ?? {};
  return {
    apiUrl: d.apiUrl,
    apiKey: d.apiKey,
    title: d.title,
    subtitle: d.subtitle,
    mountId: d.mountId ?? "td-chatbot",
    defaultOpen: d.defaultOpen === "true",
  };
}

function mount(config: WidgetConfig) {
  // API URL runtime (dibaca oleh lib/api.ts).
  if (config.apiUrl) {
    (window as unknown as Record<string, string>).__TD_CHATBOT_API_URL = config.apiUrl;
  }
  // API key runtime (opsional) — dikirim sebagai header X-API-Key oleh lib/api.ts.
  // Untuk embed CMS JANGAN pakai ini: API key disuntik server-side oleh proxy,
  // supaya tidak pernah muncul di HTML/browser.
  if (config.apiKey) {
    (window as unknown as Record<string, string>).__TD_CHATBOT_API_KEY = config.apiKey;
  }

  const host =
    document.getElementById(config.mountId ?? "td-chatbot") ??
    (() => {
      const div = document.createElement("div");
      div.id = config.mountId ?? "td-chatbot";
      document.body.appendChild(div);
      return div;
    })();

  // Penanda supaya ThemeProvider bisa menemukan shadow root ini.
  host.setAttribute("data-td-chatbot-host", "");

  // Shadow DOM untuk isolasi CSS dari halaman host.
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  const container = document.createElement("div");
  /**
   * Root tema di dalam shadow. Class `dark` ditempelkan ke elemen ini
   * (bukan cuma ke <html>) supaya varian Tailwind `dark:` ikut aktif.
   */
  container.setAttribute("data-theme-root", "");
  shadow.appendChild(container);

  createRoot(container).render(
    <StrictMode>
      <ThemeProvider>
        <ToastProvider>
          <ChatWidget
            title={config.title}
            subtitle={config.subtitle}
            defaultOpen={config.defaultOpen}
          />
        </ToastProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

const cfg = readConfig();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => mount(cfg));
} else {
  mount(cfg);
}
