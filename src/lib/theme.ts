import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "excalibur:theme";
const EVT = "excalibur:theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme => "light";

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}