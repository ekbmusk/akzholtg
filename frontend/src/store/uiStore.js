import { create } from 'zustand';

const FONT_KEY = 'reading_font_size';
const FOCUS_KEY = 'reading_focus_mode';

const FONT_SIZES = { S: 15, M: 17, L: 20 };

function readFont() {
  if (typeof window === 'undefined') return 'M';
  return localStorage.getItem(FONT_KEY) || 'M';
}

function readFocus() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(FOCUS_KEY) === '1';
}

function applyFontSize(size) {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(
      '--reading-font-size',
      `${FONT_SIZES[size] ?? 17}px`,
    );
  }
}

export const useUiStore = create((set, get) => ({
  toast: null,
  fontSize: readFont(),
  focusMode: readFocus(),

  showToast(message, tone = 'default') {
    set({ toast: { message, tone, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 2400);
  },
  dismiss() {
    set({ toast: null });
  },

  setFontSize(size) {
    if (!FONT_SIZES[size]) return;
    localStorage.setItem(FONT_KEY, size);
    applyFontSize(size);
    set({ fontSize: size });
  },

  toggleFocus() {
    const next = !get().focusMode;
    localStorage.setItem(FOCUS_KEY, next ? '1' : '0');
    set({ focusMode: next });
  },

  initReadingPrefs() {
    applyFontSize(get().fontSize);
  },
}));
