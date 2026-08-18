import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import EndUserApp from "./EndUserApp";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./components/ui/Toast";
import "./index.css";

/*
 * Dua sudut pandang (POV) dalam satu build:
 *   /        -> EndUserApp  : ruang chat bersih untuk end-user
 *   /admin   -> App         : dashboard admin (Dokumen, Kelola DB, Riwayat)
 *
 * SPA fallback sudah diatur di vercel.json (semua rute -> index.html), jadi
 * cukup memilih root berdasarkan pathname. Tanpa dependensi router tambahan.
 */
const isAdmin =
  typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
const Root = isAdmin ? App : EndUserApp;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
