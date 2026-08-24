/**
 * Gerbang autentikasi untuk dashboard admin (rute /admin).
 *
 * - Saat mount: kalau belum ada token -> tampilkan form login. Kalau ada token,
 *   verifikasi ke /auth/me; valid -> render dashboard, gagal -> form login.
 * - Mendengarkan event global "tdc:unauthorized" (dipicu lib/api.ts saat sebuah
 *   permintaan admin dijawab 401) untuk otomatis kembali ke layar login.
 * - Menyediakan useAuth() agar dashboard tahu user aktif & tombol keluar.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { fetchMe, login as apiLogin, logout as apiLogout } from "../../lib/api";
import type { AdminUser } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { BrandAvatar } from "../../components/ui/BrandAvatar";

interface AuthState {
  user: AdminUser;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthGate>");
  return ctx;
}

type Status = "checking" | "anon" | "authed";

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [user, setUser] = useState<AdminUser | null>(null);

  const verify = useCallback(async () => {
    if (!getToken()) {
      setStatus("anon");
      return;
    }
    try {
      const me = await fetchMe();
      if (me.role !== "admin") {
        setStatus("anon");
        return;
      }
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
      <LoginForm
        onSuccess={(u) => {
          setUser(u);
          setStatus("authed");
        }}
      />
    );
  }

  return <AuthCtx.Provider value={{ user, logout }}>{children}</AuthCtx.Provider>;
}

function LoginForm({ onSuccess }: { onSuccess: (u: AdminUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const u = await apiLogin(username.trim(), password);
      if (u.role !== "admin") {
        apiLogout();
        setError("Akun ini tidak punya akses admin.");
        return;
      }
      onSuccess(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-jet-100 px-4 dark:bg-night-950">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-night-700 dark:bg-night-900"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandAvatar className="h-12 w-12" rounded="full" alt="Cobee" />
          <div>
            <p className="text-lg font-semibold text-navy dark:text-jet-100">
              Masuk Admin
            </p>
            <p className="text-xs text-slate-500 dark:text-brand-200/70">
              Panel admin Cobee — Timedoor Academy
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-blush-200 bg-blush-50 px-3 py-2 text-sm text-blush-700 dark:border-blush-500/40 dark:bg-blush-500/10 dark:text-blush-200">
            {error}
          </div>
        )}

        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-brand-100">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-night-600 dark:bg-night-800 dark:text-jet-100"
        />

        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-brand-100">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-6 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-night-600 dark:bg-night-800 dark:text-jet-100"
        />

        <button
          type="submit"
          disabled={busy || !username.trim() || !password}
          className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
