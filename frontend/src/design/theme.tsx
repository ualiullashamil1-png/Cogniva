import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "cogniva-theme";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* localStorage может быть недоступен */ }
    return "light";                       // по умолчанию — светлая (фирменная) тема
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;   // CSS-переменные переключаются по этому атрибуту
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme(t => (t === "dark" ? "light" : "dark")), []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="cg-btn cg-btn--ghost cg-btn--sm" onClick={toggle} type="button"
            aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}>
      {theme === "dark" ? "☀ Светлая" : "🌙 Тёмная"}
    </button>
  );
}