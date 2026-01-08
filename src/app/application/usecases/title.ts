import type { TabState } from "../state/tabState";

export function formatTitle(tab?: TabState | null) {
  if (!tab) return "BrainRust";
  return tab.isDirty ? `${tab.title}*` : tab.title;
}
