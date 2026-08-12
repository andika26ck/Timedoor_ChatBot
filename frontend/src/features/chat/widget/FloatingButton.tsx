import { BrandAvatar } from "../../../components/ui/BrandAvatar";

interface FloatingButtonProps {
  isOpen: boolean;
  unreadCount?: number;
  onClick: () => void;
}

/** Tombol bulat mengambang (kanan bawah) untuk buka/tutup widget. */
export function FloatingButton({ isOpen, unreadCount = 0, onClick }: FloatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Tutup chat" : "Buka chat"}
      className={
        "relative grid h-14 w-14 place-items-center overflow-hidden rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 " +
        (isOpen
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : "bg-white ring-2 ring-brand-600/20")
      }
    >
      <span className="transition-transform duration-200">
        {isOpen ? (
          <CloseIcon />
        ) : (
          <BrandAvatar className="h-14 w-14" rounded="full" alt="Buka chat Cobee" />
        )}
      </span>
      {!isOpen && unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-blush px-1 text-[11px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
