import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { EndUserIdentity } from "./identity";

interface Props {
  open: boolean;
  initial: EndUserIdentity;
  /** true = tampilkan tombol "Lewati" (mode prompt pertama kali). */
  allowSkip?: boolean;
  onSave: (id: EndUserIdentity) => void;
  onSkip?: () => void;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm " +
  "text-jet-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 " +
  "dark:border-night-700 dark:bg-night-800 dark:text-jet-100";

/**
 * Dialog identitas ringan untuk halaman chat publik. Bukan autentikasi (tanpa
 * password) - hanya melabeli percakapan dengan nama/email agar tidak anonim.
 */
export function IdentityDialog({
  open,
  initial,
  allowSkip = false,
  onSave,
  onSkip,
  onClose,
}: Props) {
  const [name, setName] = useState(initial.userName);
  const [email, setEmail] = useState(initial.userEmail);
  const [userId, setUserId] = useState(initial.userId);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial.userName);
      setEmail(initial.userEmail);
      setUserId(initial.userId);
      setErr("");
    }
  }, [open, initial]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const nm = name.trim();
    const em = email.trim();
    if (!nm && !em) {
      setErr("Isi minimal nama atau email.");
      return;
    }
    if (em && !EMAIL_RE.test(em)) {
      setErr("Format email tidak valid.");
      return;
    }
    onSave({ userId: userId.trim(), userName: nm, userEmail: em });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-jet-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Isi identitas"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-night-900">
        <h2 className="text-base font-semibold text-navy dark:text-jet-100">
          Kenalan dulu yuk 👋
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-brand-200/70">
          Isi nama/email biar tim tahu siapa yang bertanya. Opsional — bisa
          dilewati untuk tetap anonim.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-jet-700 dark:text-jet-100">
              Nama
            </span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Budi Santoso"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-jet-700 dark:text-jet-100">
              Email
            </span>
            <input
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mis. budi@contoh.com"
              type="email"
            />
          </label>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            {allowSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-jet-100 dark:text-brand-200/70 dark:hover:bg-night-800"
              >
                Lewati (anonim)
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-jet-100 dark:text-brand-200/70 dark:hover:bg-night-800"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
