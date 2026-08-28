import { useEffect, useState, type FormEvent } from "react";
import { useConfirm } from "./ui/Confirm";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
  type TemplateInfo,
} from "../lib/api";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Terjadi kesalahan.";
}

export function TemplatesPanel() {
  const confirm = useConfirm();
  const [items, setItems] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function refresh() {
    setLoading(true);
    setListError(null);
    try {
      setItems(await listTemplates());
    } catch (e) {
      setListError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createTemplate(text);
      setNewText("");
      await refresh();
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(t: TemplateInfo) {
    setEditingId(t.id);
    setEditText(t.text);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateTemplate(id, text);
      cancelEdit();
      await refresh();
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string, text: string) {
    if (busy) return;
    if (!(await confirm({ title: "Hapus template", message: `Hapus template "${text}"?`, confirmText: "Hapus", danger: true }))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTemplate(id);
      await refresh();
    } catch (e2) {
      setError(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-800">Tambah Pertanyaan Template</h2>
          <p className="text-sm text-gray-500 mt-1">
            Template ini muncul sebagai tombol siap-klik di menu Chat.
          </p>
          <form onSubmit={onCreate} className="mt-4 flex gap-3">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="mis. Bagaimana cara klaim reimbursement?"
              disabled={busy}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={busy || !newText.trim()}
              className="rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-black disabled:opacity-40"
            >
              Tambah
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Daftar Template</h2>
              <p className="text-sm text-gray-500">{items.length} template</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="px-6 py-8 text-sm text-gray-400">Memuat...</p>
          ) : listError ? (
            <p className="px-6 py-8 text-sm text-red-600">{listError}</p>
          ) : items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">Belum ada template.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((t) => (
                <li key={t.id} className="px-6 py-4">
                  {editingId === t.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        disabled={busy}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => void saveEdit(t.id)}
                        disabled={busy || !editText.trim()}
                        className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black disabled:opacity-40"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <p className="flex-1 text-sm text-gray-800">{t.text}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          disabled={busy}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(t.id, t.text)}
                          disabled={busy}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
