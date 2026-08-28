/**
 * Penyimpanan token autentikasi di browser (localStorage).
 *
 * Token dikirim sebagai header `Authorization: Bearer <token>` untuk semua
 * permintaan (lihat lib/api.ts). Slot token dipisah admin vs end-user
 * lewat isAdminScope() agar login user biasa tidak menimpa sesi admin.
 */
const ADMIN_TOKEN_KEY = "tdc:admin-token";
const USER_TOKEN_KEY = "tdc:user-token";

/** True bila kode berjalan di rute dashboard admin ("/admin..."). */
export function isAdminScope(): boolean {
  try {
    return window.location.pathname.startsWith("/admin");
  } catch {
    return false;
  }
}

/** Kunci token localStorage sesuai POV aktif (admin vs end-user). */
function tokenKey(): string {
  return isAdminScope() ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY;
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(tokenKey());
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(tokenKey(), token);
  } catch {
    /* localStorage tidak tersedia — abaikan */
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(tokenKey());
  } catch {
    /* abaikan */
  }
}
