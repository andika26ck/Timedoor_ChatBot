import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  type AdminUser,
} from "../lib/api";
import { useAuth } from "../features/auth/AuthGate";
import { useToast } from "./ui/Toast";
import { Pagination } from "./ui/Pagination";

/** Token warna dipakai bersama supaya light & dark konsisten dengan brand. */
const CARD =
  "rounded-2xl border border-slate-200 bg-white " +
  "dark:border-night-700 dark:bg-night-900";

const FIELD =
  "w-full rounded-xl border px-3 py-2 text-sm transition " +
  "border-slate-200 bg-white text-jet-700 placeholder:text-slate-400 " +
  "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-600/15 " +
  "disabled:opacity-40 " +
  "dark:border-night-600 dark:bg-night-800 dark:text-jet-100 " +
  "dark:placeholder:text-brand-200/40 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";

const PRIMARY_BTN =
  "rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition " +
  "hover:bg-brand-700 disabled:opacity-40 dark:hover:bg-brand-500";

const SECONDARY_BTN =
  "rounded-xl border px-4 py-2 text-sm transition disabled:opacity-40 " +
  "border-slate-200 text-jet-700 hover:bg-jet-100 " +
  "dark:border-night-600 dark:text-brand-100 dark:hover:bg-night-800";

const DANGER_BTN =
  "rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition " +
  "hover:bg-red-700 disabled:opacity-40";

const PAGE_SIZE = 10;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Terjadi kesalahan.";
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleBadge({ role }: { role: string }) {
  const admin = role === "admin";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (admin
          ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
          : "bg-slate-100 text-slate-600 dark:bg-night-800 dark:text-brand-200/70")
      }
    >
      {admin ? "Admin" : "User"}
    </span>
  );
}

/** Overlay modal ringan tanpa dependency. */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-jet-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md p-5 ${CARD}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-navy dark:text-jet-100">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function UsersPanel() {
  const { user: me } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");

  // Pencarian & filter.
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [page, setPage] = useState(0);

  // Form tambah user.
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [adding, setAdding] = useState(false);

  // Modal reset password & hapus.
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const list = await listUsers();
      setUsers(list);
    } catch (e) {
      setError(errMsg(e));
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const list = users ?? [];
    const admin = list.filter((u) => u.role === "admin").length;
    return { total: list.length, admin, user: list.length - admin };
  }, [users]);

  const filtered = useMemo(() => {
    const list = users ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page],
  );
  // Jaga halaman tetap valid saat data menyusut (mis. setelah hapus / filter).
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) return;
    setAdding(true);
    try {
      await createUser(email.trim(), password, role, name.trim());
      toast("Akun berhasil dibuat.", "success");
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setShowAdd(false);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleReset() {
    if (!resetTarget || resetPwd.length < 6) return;
    setResetting(true);
    try {
      await resetUserPassword(resetTarget.username, resetPwd);
      toast("Password berhasil direset.", "success");
      setResetTarget(null);
      setResetPwd("");
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.username);
      toast("Akun berhasil dihapus.", "success");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setDeleting(false);
    }
  }

  const canAdd = !!email.trim() && password.length >= 6 && !adding;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Ringkasan + tombol tambah */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy dark:text-jet-100">
              Kelola User
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-brand-200/70">
              {counts.total} akun · {counts.admin} admin · {counts.user} user
            </p>
          </div>
          <button
            type="button"
            className={PRIMARY_BTN}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Tutup" : "+ Tambah user"}
          </button>
        </div>

        {/* Form tambah user */}
        {showAdd && (
          <form onSubmit={handleAdd} className={`space-y-3 p-5 ${CARD}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-jet-700 dark:text-brand-100">
                  Nama
                </label>
                <input
                  className={`mt-1 ${FIELD}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth. Budi Santoso"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-jet-700 dark:text-brand-100">
                  Email / Username
                </label>
                <input
                  className={`mt-1 ${FIELD}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cth. budi@timedoor.com"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-jet-700 dark:text-brand-100">
                  Password
                </label>
                <input
                  type="password"
                  className={`mt-1 ${FIELD}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-jet-700 dark:text-brand-100">
                  Role
                </label>
                <select
                  className={`mt-1 ${FIELD}`}
                  value={role}
                  onChange={(e) => setRole(e.target.value as "user" | "admin")}
                >
                  <option value="user">User (akses chat)</option>
                  <option value="admin">Admin (akses dashboard)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" className={PRIMARY_BTN} disabled={!canAdd}>
                {adding ? "Menyimpan\u2026" : "Simpan"}
              </button>
              <button
                type="button"
                className={SECONDARY_BTN}
                onClick={() => setShowAdd(false)}
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Pencarian & filter */}
        {users !== null && users.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${FIELD} sm:max-w-xs`}
              value={query}
              onChange={(e) => {
                setPage(0);
                setQuery(e.target.value);
              }}
              placeholder="Cari nama atau email…"
            />
            <select
              className={`${FIELD} sm:w-44`}
              value={roleFilter}
              onChange={(e) => {
                setPage(0);
                setRoleFilter(e.target.value as "all" | "admin" | "user");
              }}
            >
              <option value="all">Semua role</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <span className="text-xs text-slate-400 dark:text-brand-200/50">
              {filtered.length} dari {users.length}
            </span>
          </div>
        )}

        {/* Tabel user */}
        <div className={CARD}>
          {error && (
            <p className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {users === null && !error && (
            <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-brand-200/70">
              Memuat…
            </p>
          )}
          {users !== null && users.length === 0 && !error && (
            <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-brand-200/70">
              Belum ada akun.
            </p>
          )}
          {users !== null && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-night-700 dark:text-brand-200/50">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Email / Username</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Dibuat</th>
                    <th className="px-4 py-3 font-medium">Terakhir aktif</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-500 dark:text-brand-200/70"
                      >
                        Tidak ada akun yang cocok.
                      </td>
                    </tr>
                  )}
                  {paged.map((u) => {
                    const isSelf = u.username === me.username;
                    return (
                      <tr
                        key={u.username}
                        className="border-b border-slate-100 last:border-0 dark:border-night-800"
                      >
                        <td className="px-4 py-3 text-jet-700 dark:text-jet-100">
                          {u.name || "\u2014"}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-slate-400 dark:text-brand-200/50">
                              (Anda)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-jet-600 dark:text-brand-100">
                          {u.username}
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-brand-200/70">
                          {fmtDate(u.created_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-brand-200/70">
                          {u.last_active ? (
                            fmtDate(u.last_active)
                          ) : (
                            <span className="text-slate-400 dark:text-brand-200/40">
                              Belum pernah
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-night-800"
                              onClick={() => {
                                setResetTarget(u);
                                setResetPwd("");
                              }}
                            >
                              Reset password
                            </button>
                            <button
                              type="button"
                              disabled={isSelf}
                              title={isSelf ? "Tidak bisa menghapus akun sendiri" : undefined}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent dark:text-red-400 dark:hover:bg-night-800"
                              onClick={() => setDeleteTarget(u)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={setPage}
        />

        <p className="text-xs text-slate-400 dark:text-brand-200/50">
          Akun <strong>User</strong> hanya bisa memakai chat di halaman utama. Akun{" "}
          <strong>Admin</strong> bisa masuk ke dashboard ini. Email dipakai sebagai
          identitas di Riwayat Pengguna.
        </p>
      </div>

      {/* Modal reset password */}
      {resetTarget && (
        <Modal title="Reset password" onClose={() => setResetTarget(null)}>
          <p className="text-sm text-slate-500 dark:text-brand-200/70">
            Atur password baru untuk{" "}
            <strong className="text-jet-700 dark:text-jet-100">
              {resetTarget.username}
            </strong>
            .
          </p>
          <input
            type="password"
            className={`mt-3 ${FIELD}`}
            value={resetPwd}
            onChange={(e) => setResetPwd(e.target.value)}
            placeholder="Password baru (min. 6 karakter)"
            autoComplete="new-password"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={SECONDARY_BTN}
              onClick={() => setResetTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className={PRIMARY_BTN}
              disabled={resetPwd.length < 6 || resetting}
              onClick={handleReset}
            >
              {resetting ? "Menyimpan\u2026" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal konfirmasi hapus */}
      {deleteTarget && (
        <Modal title="Hapus akun" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-500 dark:text-brand-200/70">
            Yakin ingin menghapus{" "}
            <strong className="text-jet-700 dark:text-jet-100">
              {deleteTarget.username}
            </strong>
            ? Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={SECONDARY_BTN}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className={DANGER_BTN}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Menghapus\u2026" : "Hapus"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
