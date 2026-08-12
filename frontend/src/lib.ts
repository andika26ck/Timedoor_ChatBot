/**
 * Entry point PUBLIC untuk distribusi NPM (floating chat widget saja).
 *
 * Dashboard (App, DocumentsPanel, SettingsPanel, TemplatesPanel) SENGAJA
 * tidak di-export dan tidak di-import dari sini, jadi tidak ikut ke bundle.
 */

/** Komponen utama: tombol bulat mengambang + panel chat. */
import "./styles/widget.css";
export { ChatWidget } from "./features/chat/widget/ChatWidget";

/** Provider tema — bungkus app kalau mau dark mode ikut aktif. */
export { ThemeProvider, useTheme } from "./contexts/ThemeContext";

/** Opsional: dipakai kalau user mau menyusun layout chat sendiri. */
export { ChatPanel } from "./features/chat/components/ChatPanel";
export { ChatWindow } from "./features/chat/widget/ChatWindow";
export { ChatHeader } from "./features/chat/widget/ChatHeader";
export { FloatingButton } from "./features/chat/widget/FloatingButton";

/** Types publik. */
export type { ChatMessage, FeedbackValue } from "./features/chat/types";
