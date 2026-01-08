import type { AppState } from "../state/tabState";
import type { AppDependencies } from "./types";

export async function confirmCloseApp(state: AppState, deps: AppDependencies): Promise<boolean> {
  const hasDirtyTabs = state.tabs.some((tab) => tab.isDirty);
  if (!hasDirtyTabs) return true;
  return deps.dialog.confirm(
    "You have unsaved changes. Are you sure you want to exit?",
    { kind: "warning", title: "Unsaved Changes" }
  );
}
