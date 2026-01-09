import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  defaultThemeColors,
  loadTheme,
  persistTheme,
  resolveThemeColors,
  type Theme,
  type ThemeColors
} from "../theme/theme";

export function useThemeHandler() {
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const themeColorsRef = useRef<ThemeColors>(defaultThemeColors);

  useEffect(() => {
    persistTheme(theme);
    themeColorsRef.current = resolveThemeColors();
  }, [theme]);

  const applyTheme = useCallback((nextTheme: Theme) => {
    setTheme(nextTheme);
  }, []);

  const updateThemeColors = useCallback(() => {
    themeColorsRef.current = resolveThemeColors();
  }, []);

  return { theme, applyTheme, themeColorsRef, updateThemeColors };
}
