/**
 * Gerbang autentikasi untuk halaman chat end-user (rute "/").
 *
 * Chat digembok: user WAJIB login/daftar sebelum bisa bertanya. Token disimpan
 * di localStorage (dipakai bersama admin), tapi gate ini menerima SEMUA akun
 * yang valid (role "user" maupun "admin"). Identitas login otomatis terkirim
 * lewat token pada tiap /ask, jadi riwayat tidak lagi anonim.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  registerUser,
} from "../../lib/api";
import type { AdminUser } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { BrandAvatar } from "../../components/ui/BrandAvatar";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

interface EndUserState {
  user: AdminUser;
  logout: () => void;
}

const EndUserCtx = createContext<EndUserState | null>(null);

export function useEndUser(): EndUserState {
  const ctx = useContext(EndUserCtx);
  if (!ctx) throw new Error("useEndUser harus dipakai di dalam <EndUserAuthGate>");
  return ctx;
}

type Status = "checking" | "anon" | "authed";

export function EndUserAuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [user, setUser] = useState<AdminUser | null>(null);

  const verify = useCallback(async () => {
    if (!getToken()) {
      setStatus("anon");
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      setStatus("authed");
    } catch {
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  useEffect(() => {
    function onUnauth() {
      setUser(null);
      setStatus("anon");
    }
    window.addEventListener("tdc:unauthorized", onUnauth);
    return () => window.removeEventListener("tdc:unauthorized", onUnauth);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
    setStatus("anon");
  }, []);

  if (status === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-jet-100 text-sm text-slate-500 dark:bg-night-950 dark:text-brand-200/70">
        Memuat…
      </div>
    );
  }

  if (status === "anon" || !user) {
    return (
      <AuthCard
        onSuccess={(u) => {
          setUser(u);
          setStatus("authed");
        }}
      />
    );
  }

  return (
    <EndUserCtx.Provider value={{ user, logout }}>{children}</EndUserCtx.Provider>
  );
}

function AuthCard({ onSuccess }: { onSuccess: (u: AdminUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const u = isRegister
        ? await registerUser(name.trim(), email.trim(), password)
        : await apiLogin(email.trim(), password);
      onSuccess(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !!email.trim() && password.length >= 6 && (!isRegister || !!name.trim());

  return (
    <div
      data-theme-root
      className="relative flex h-screen items-center justify-center bg-jet-100 px-4 dark:bg-night-950"
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-night-700 dark:bg-night-900"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandAvatar className="h-12 w-12" rounded="full" alt="Cobee" />
          <div>
            <p className="text-lg font-semibold text-navy dark:text-jet-100">
              {isRegister ? "Daftar ke Cobee" : "Masuk ke Cobee"}
            </p>
            <p className="text-xs text-slate-500 dark:text-brand-200/70">
              {isRegister
                ? "Buat akun untuk mulai bertanya"
                : "Masuk untuk mulai bertanya"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-blush-200 bg-blush-50 px-3 py-2 text-sm text-blush-700 dark:border-blush-500/40 dark:bg-blush-500/10 dark:text-blush-200">
            {error}
          </div>
        )}

        {isRegister && (
          <>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-brand-100">
              Nama
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
              className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-night-600 dark:bg-night-800 dark:text-jet-100"
            />
          </>
        )}

        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-brand-100">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete={isRegister ? "email" : "username"}
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-night-600 dark:bg-night-800 dark:text-jet-100"
        />

        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-brand-100">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-night-600 dark:bg-night-800 dark:text-jet-100"
        />
        <p className="mb-6 text-[11px] text-slate-400 dark:text-brand-200/60">
          Minimal 6 karakter.
        </p>

        <button
          type="submit"
          disabled={busy || !canSubmit}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Memproses…" : isRegister ? "Daftar" : "Masuk"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-brand-200/70">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? "login" : "register");
              setError(null);
            }}
            className="font-semibold text-brand-600 hover:underline dark:text-brand-300"
          >
            {isRegister ? "Masuk di sini" : "Daftar di sini"}
          </button>
        </p>
      </form>
    </div>
  );
}
