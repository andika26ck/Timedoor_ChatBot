/** Gabungkan className kondisional tanpa dependency (pengganti clsx ringan). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
