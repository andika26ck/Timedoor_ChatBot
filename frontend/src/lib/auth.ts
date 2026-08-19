/**
 * Penyimpanan token admin di browser (localStorage).
 *
 * Token dikirim sebagai header `Authorization: Bearer <token>` untuk semua
 * permintaan ke endpoint admin (lihat lib/api.ts). Hanya dipakai di rute
 * /admin; halaman end-user tidak butuh token.
 */
const TOKEN_KEY = "tdc:admin-token";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* localStorage tidak tersedia — abaikan */
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
}
