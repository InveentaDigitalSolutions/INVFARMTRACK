/**
 * Whether the app is currently in dark mode.
 *
 * App.tsx owns the choice and writes it to the root element as a class. The 3D
 * scene sits several components away and has no business threading a prop
 * through all of them for something that is, in the end, a property of the
 * document — so it reads the class and watches for it changing.
 */

import { useEffect, useState } from "react";

const isDark = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("dark");

export function useDarkMode(): boolean {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    // The class can change between first render and this effect running.
    setDark(isDark());
    return () => observer.disconnect();
  }, []);

  return dark;
}
