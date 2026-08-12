import { useEffect, useState } from "react";
import { getHealth } from "../lib/api";

type State =
  | { kind: "checking" }
  | { kind: "ok"; model: string }
  | { kind: "no-store"; model: string }
  | { kind: "down" };

/**
 * Indikator koneksi ke backend di header.
 *
 * Sengaja membedakan "server mati" dan "server hidup tapi KB belum diindeks",
 * karena dua kondisi itu penanganannya beda jauh saat debugging.
 */
export default function StatusBadge() {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    let alive = true;

    async function check() {
      try {
        const h = await getHealth();
        if (!alive) return;
        setState(
          h.store_configured
            ? { kind: "ok", model: h.model }
            : { kind: "no-store", model: h.model },
        );
      } catch {
        if (alive) setState({ kind: "down" });
      }
    }

    check();
    // cek ulang berkala supaya badge ikut berubah kalau backend baru dinyalakan
    const timer = setInterval(check, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const style = {
    checking: "bg-slate-100 text-slate-500 border-slate-200",
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "no-store": "bg-amber-50 text-amber-700 border-amber-200",
    down: "bg-red-50 text-red-700 border-red-200",
  }[state.kind];

  const dot = {
    checking: "bg-slate-400",
    ok: "bg-emerald-500",
    "no-store": "bg-amber-500",
    down: "bg-red-500",
  }[state.kind];

  const label =
    state.kind === "checking"
      ? "Mengecek koneksi..."
      : state.kind === "ok"
        ? `Online · ${state.model}`
        : state.kind === "no-store"
          ? "Server ok, KB belum diindeks"
          : "Server tidak terhubung";

  return (
    <span
      title={
        state.kind === "down"
          ? "Jalankan: uvicorn app.main:app --reload --port 8000"
          : state.kind === "no-store"
            ? "Tambahkan dokumen lewat menu Dokumen, atau jalankan scripts/index_documents.py"
            : undefined
      }
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
