export type Theme = "light" | "dark";

export type ThemeColors = {
  canvasBg: string;
  edge: string;
  node: string;
  nodeSelected: string;
  nodeBorder: string;
  nodeBorderSelected: string;
  nodeSelectedGlow: string;
  text: string;
  textSelected: string;
};

export const THEME_STORAGE_KEY = "brainrust-theme";

export const defaultThemeColors: ThemeColors = {
  canvasBg: "#f5f6f8",
  edge: "#b1b7c0",
  node: "#ffffff",
  nodeSelected: "#3f6fe5",
  nodeBorder: "#d7dce3",
  nodeBorderSelected: "#2f56b8",
  nodeSelectedGlow: "rgba(63, 111, 229, 0.32)",
  text: "#1f2328",
  textSelected: "#ffffff"
};

function getCssVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function resolveThemeColors(): ThemeColors {
  return {
    canvasBg: getCssVar("--canvas-bg", defaultThemeColors.canvasBg),
    edge: getCssVar("--edge-color", defaultThemeColors.edge),
    node: getCssVar("--node-bg", defaultThemeColors.node),
    nodeSelected: getCssVar("--node-selected-bg", defaultThemeColors.nodeSelected),
    nodeBorder: getCssVar("--node-border", defaultThemeColors.nodeBorder),
    nodeBorderSelected: getCssVar("--node-selected-border", defaultThemeColors.nodeBorderSelected),
    nodeSelectedGlow: getCssVar("--node-selected-glow", defaultThemeColors.nodeSelectedGlow),
    text: getCssVar("--text-color", defaultThemeColors.text),
    textSelected: getCssVar("--text-color-selected", defaultThemeColors.textSelected)
  };
}

export function loadTheme(storage: Storage = localStorage): Theme {
  const stored = storage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "light";
}

export function persistTheme(theme: Theme, storage: Storage = localStorage) {
  storage.setItem(THEME_STORAGE_KEY, theme);
}
