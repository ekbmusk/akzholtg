/**
 * Wrapper around Telegram.WebApp. Calls degrade silently outside Telegram so
 * the app stays usable in a normal browser during development.
 *
 * Dev shim: when `import.meta.env.DEV` is true and no real initData is
 * available, getInitData/getInitDataUnsafe synthesise a fake user so the app
 * is usable from a regular browser. Override via URL params:
 *   ?dev_user_id=42&dev_first_name=Aigerim&dev_username=aigerim
 * The selection persists in localStorage. Prod builds skip this entirely.
 */
function tg() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

export function bootstrap() {
  const w = tg();
  if (!w) return;
  try {
    w.ready();
    w.expand();
    w.setHeaderColor?.('#0B1320');
    w.setBackgroundColor?.('#0B1320');
  } catch {
    // Older Telegram clients won't have all setters.
  }
}

const DEV_USER_KEY = 'stem_dev_user';

function readDevUser() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  if (params.has('dev_user_id')) {
    const u = {
      id: Number(params.get('dev_user_id')),
      first_name: params.get('dev_first_name') || 'Dev',
      last_name: params.get('dev_last_name') || null,
      username: params.get('dev_username') || null,
      language_code: 'kk',
    };
    localStorage.setItem(DEV_USER_KEY, JSON.stringify(u));
    return u;
  }
  const stored = localStorage.getItem(DEV_USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* fall through */
    }
  }
  // Sensible default — can be promoted to author via AUTHOR_TELEGRAM_IDS=1.
  return { id: 1, first_name: 'Dev', username: 'dev', language_code: 'kk' };
}

function buildDevInitData(user) {
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));
  return params.toString();
}

export function isShimMode() {
  return import.meta.env.DEV && !tg()?.initData;
}

export function getDevUser() {
  return readDevUser();
}

export function getInitData() {
  const real = tg()?.initData;
  if (real) return real;
  const dev = readDevUser();
  return dev ? buildDevInitData(dev) : '';
}

export function getInitDataUnsafe() {
  const real = tg()?.initDataUnsafe;
  if (real?.user) return real;
  const dev = readDevUser();
  return dev ? { user: dev } : null;
}

export function getStartParam() {
  return tg()?.initDataUnsafe?.start_param ?? null;
}

export function haptic(type = 'light') {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  try {
    if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(type)) {
      h.impactOccurred(type);
    } else if (['error', 'success', 'warning'].includes(type)) {
      h.notificationOccurred(type);
    } else if (type === 'select') {
      h.selectionChanged();
    }
  } catch {
    /* noop */
  }
}

export function openExternal(url) {
  const w = tg();
  if (w?.openLink) {
    w.openLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Open a t.me link inside Telegram (share dialog, chats, …). Falls back to a
 * plain window.open when called from a normal browser / dev shim.
 */
export function openTelegram(url) {
  const w = tg();
  if (w?.openTelegramLink) {
    w.openTelegramLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
