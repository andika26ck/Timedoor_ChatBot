import cobeeAvatar from "../../assets/cobee-avatar.png";

type BrandAvatarProps = {
  /** Tailwind size classes, e.g. "h-9 w-9" */
  className?: string;
  /** rounded-xl (sidebar) atau rounded-full (widget) */
  rounded?: "xl" | "full" | "2xl";
  alt?: string;
};

/**
 * Avatar brand Cobee — satu sumber foto untuk sidebar & floating chat.
 * Ganti file di `src/assets/cobee-avatar.png` (dan `public/cobee-avatar.png`)
 * kalau mau ganti foto lain nanti.
 */
export function BrandAvatar({
  className = "h-9 w-9",
  rounded = "full",
  alt = "Cobee",
}: BrandAvatarProps) {
  const radius =
    rounded === "xl" ? "rounded-xl" : rounded === "2xl" ? "rounded-2xl" : "rounded-full";

  return (
    <img
      src={cobeeAvatar}
      alt={alt}
      draggable={false}
      className={`${className} ${radius} object-cover bg-brand-600 shadow-sm ring-2 ring-white/40`}
    />
  );
}

/** Path publik (kalau butuh di HTML mentah / demo). */
export const BRAND_AVATAR_PUBLIC_PATH = "/cobee-avatar.png";
