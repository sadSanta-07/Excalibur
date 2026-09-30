const KEY = "excalibur:recent";
const EVT = "excalibur:recent-change";

export interface RecentCanvas {
  id: string;
  title: string;
  openedAt: number;
}

export function subscribeRecent(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVT, cb);
  };
}

export function getRecentRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseRecent(raw: string): RecentCanvas[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list: RecentCanvas[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVT));
  } catch {
    /* storage unavailable */
  }
}

export function rememberCanvas(id: string, title: string) {
  const rest = parseRecent(getRecentRaw()).filter((c) => c.id !== id);
  write([{ id, title, openedAt: Date.now() }, ...rest].slice(0, 12));
}

export function removeRecent(id: string) {
  write(parseRecent(getRecentRaw()).filter((c) => c.id !== id));
}