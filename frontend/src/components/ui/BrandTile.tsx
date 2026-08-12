import { useId } from "react";

interface BrandTileProps {
  /**
   * Warna tile diatur lewat text-color, karena semua shape memakai
   * `currentColor`. Contoh: "text-white/15 dark:text-brand-500/20".
   */
  className?: string;
  /** Ukuran satu ubin pola (px). Default 96. */
  size?: number;
}

/**
 * Pattern tile brand Timedoor (bentuk-bentuk ikonik: tri-circle, chevron,
 * asterisk, leaf, corner, wifi, diamond) sebagai background dekoratif.
 *
 * Dipakai sebagai lapisan absolute di dalam container `relative overflow-hidden`.
 * Karena memakai `currentColor`, warnanya gampang dibedakan light vs dark.
 */
export function BrandTile({ className = "", size = 96 }: BrandTileProps) {
  const rawId = useId();
  const patternId = `td-tile-${rawId.replace(/[:]/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <pattern id={patternId} width={size} height={size} patternUnits="userSpaceOnUse">
          <g fill="currentColor" stroke="currentColor">
            {/* tri-circle */}
            <g stroke="none">
              <circle cx="14" cy="12" r="4.5" />
              <circle cx="26" cy="12" r="4.5" />
              <circle cx="20" cy="22" r="4.5" />
            </g>

            {/* chevron pair < > */}
            <g
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(48 8)"
            >
              <path d="M7 0 L0 7 L7 14" />
              <path d="M13 0 L20 7 L13 14" />
            </g>

            {/* asterisk / flower */}
            <g stroke="none" transform="translate(82 15)">
              <rect x="-9" y="-2.2" width="18" height="4.4" rx="2.2" />
              <rect x="-9" y="-2.2" width="18" height="4.4" rx="2.2" transform="rotate(60)" />
              <rect x="-9" y="-2.2" width="18" height="4.4" rx="2.2" transform="rotate(120)" />
            </g>

            {/* leaf / eye */}
            <g stroke="none" transform="translate(8 44)" fillRule="evenodd">
              <path d="M0 9 C6 0 18 0 24 9 C18 18 6 18 0 9 Z M12 6 A3 3 0 1 0 12 12 A3 3 0 1 0 12 6 Z" />
            </g>

            {/* corner L */}
            <g stroke="none" transform="translate(48 44)">
              <path d="M0 0 H13 A4 4 0 0 1 17 4 V9 H9 V17 H0 Z" />
            </g>

            {/* wifi arcs */}
            <g fill="none" strokeWidth="3.5" strokeLinecap="round" transform="translate(76 46)">
              <path d="M0 17 A17 17 0 0 1 17 0" />
              <path d="M7 17 A10 10 0 0 1 17 7" />
            </g>

            {/* diamond ring */}
            <g
              fill="none"
              strokeWidth="4"
              strokeLinejoin="round"
              transform="translate(16 76) rotate(45)"
            >
              <rect x="-7" y="-7" width="14" height="14" rx="3" />
            </g>

            {/* asterisk kecil */}
            <g stroke="none" transform="translate(50 78) scale(0.8)">
              <rect x="-9" y="-2.2" width="18" height="4.4" rx="2.2" />
              <rect x="-9" y="-2.2" width="18" height="4.4" rx="2.2" transform="rotate(60)" />
              <rect x="-9" y="-2.2" width="18" height="4.4" rx="2.2" transform="rotate(120)" />
            </g>

            {/* chevron tunggal */}
            <g
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(78 72)"
            >
              <path d="M0 0 L7 7 L0 14" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
