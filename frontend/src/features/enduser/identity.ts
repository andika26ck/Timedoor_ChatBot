import { useCallback, useEffect, useState } from "react";

/**
 * Identitas end-user untuk halaman chat publik (rute "/").
 *
 * Tujuannya PELABELAN, bukan autentikasi: data diisi user sendiri (form ringan)
 * atau di-prefill lewat query URL, lalu di-set ke window global
 * (`__TD_CHATBOT_USER_*`) yang dibaca `lib/api.ts` -> getUserFields() dan
 * dikirim di body /ask & /ask/stream. Kosong = percakapan tetap anonim.
 */
export interface EndUserIdentity {
  userId: string;
  userName: string;
  userEmail: string;
}

const STORAGE_KEY = "td_enduser_identity";
const SKIP_KEY = "td_enduser_identity_skipped";
const URL_KEYS = [
  "user_id",
  "user_name",
  "user_email",
  "uid",
  "id",
  "name",
  "nama",
  "email",
];

export const EMPTY_IDENTITY: EndUserIdentity = {
  userId: "",
  userName: "",
  userEmail: "",
};

export function hasIdentity(id: EndUserIdentity): boolean {
  return !!(id.userId.trim() || id.userName.trim() || id.userEmail.trim());
}

/** Set/clear window global yang dibaca api.ts getUserFields(). */
export function applyIdentity(id: EndUserIdentity): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, string | undefined>;
  w.__TD_CHATBOT_USER_ID = id.userId.trim() || undefined;
  w.__TD_CHATBOT_USER_NAME = id.userName.trim() || undefined;
  w.__TD_CHATBOT_USER_EMAIL = id.userEmail.trim() || undefined;
}

function readStorage(): EndUserIdentity | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<EndUserIdentity>;
    const id: EndUserIdentity = {
      userId: (p.userId ?? "").toString(),
      userName: (p.userName ?? "").toString(),
      userEmail: (p.userEmail ?? "").toString(),
    };
    return hasIdentity(id) ? id : null;
  } catch {
    return null;
  }
}

function writeStorage(id: EndUserIdentity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
  } catch {
    /* localStorage bisa gagal (mode privat) - abaikan */
  }
}

/**
 * Baca identitas dari query string. Mendukung `user_id`/`user_name`/`user_email`
 * plus alias ramah (`id`, `uid`, `name`, `nama`, `email`).
 */
function readUrl(): EndUserIdentity | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = q.get(k);
        if (v != null && v.trim() !== "") return v.trim();
      }
      return "";
    };
    const id: EndUserIdentity = {
      userId: get("user_id", "uid", "id"),
      userName: get("user_name", "name", "nama"),
      userEmail: get("user_email", "email"),
    };
    return hasIdentity(id) ? id : null;
  } catch {
    return null;
  }
}

/** Buang param identitas dari URL supaya tidak ikut ter-share/ter-bookmark. */
function stripUrl(): void {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const k of URL_KEYS) {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        changed = true;
      }
    }
    if (changed) {
      const qs = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        url.pathname + (qs ? `?${qs}` : "") + url.hash,
      );
    }
  } catch {
    /* abaikan */
  }
}

export interface UseEndUserIdentity {
  identity: EndUserIdentity;
  hasIdentity: boolean;
  /** true bila perlu menampilkan dialog isian (belum ada identitas & belum di-skip). */
  needsPrompt: boolean;
  editorOpen: boolean;
  save: (id: EndUserIdentity) => void;
  skip: () => void;
  clear: () => void;
  openEditor: () => void;
  closeEditor: () => void;
}

export function useEndUserIdentity(): UseEndUserIdentity {
  const [identity, setIdentity] = useState<EndUserIdentity>(EMPTY_IDENTITY);
  const [editorOpen, setEditorOpen] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [resolved, setResolved] = useState(false);

  // Resolusi awal (sekali): URL menang atas localStorage. URL langsung disimpan.
  useEffect(() => {
    const fromUrl = readUrl();
    if (fromUrl) {
      setIdentity(fromUrl);
      writeStorage(fromUrl);
      applyIdentity(fromUrl);
      stripUrl();
      setResolved(true);
      return;
    }
    const fromStore = readStorage();
    if (fromStore) {
      setIdentity(fromStore);
      applyIdentity(fromStore);
      setResolved(true);
      return;
    }
    try {
      setSkipped(window.localStorage.getItem(SKIP_KEY) === "1");
    } catch {
      /* abaikan */
    }
    setResolved(true);
  }, []);

  const save = useCallback((raw: EndUserIdentity) => {
    const clean: EndUserIdentity = {
      userId: raw.userId.trim(),
      userName: raw.userName.trim(),
      userEmail: raw.userEmail.trim(),
    };
    setIdentity(clean);
    writeStorage(clean);
    applyIdentity(clean);
    setEditorOpen(false);
    setSkipped(false);
    try {
      window.localStorage.removeItem(SKIP_KEY);
    } catch {
      /* abaikan */
    }
  }, []);

  const skip = useCallback(() => {
    setSkipped(true);
    setEditorOpen(false);
    try {
      window.localStorage.setItem(SKIP_KEY, "1");
    } catch {
      /* abaikan */
    }
  }, []);

  const clear = useCallback(() => {
    setIdentity(EMPTY_IDENTITY);
    applyIdentity(EMPTY_IDENTITY);
    setSkipped(true);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(SKIP_KEY, "1");
    } catch {
      /* abaikan */
    }
  }, []);

  const has = hasIdentity(identity);
  return {
    identity,
    hasIdentity: has,
    needsPrompt: resolved && !has && !skipped,
    editorOpen,
    save,
    skip,
    clear,
    openEditor: () => setEditorOpen(true),
    closeEditor: () => setEditorOpen(false),
  };
}
