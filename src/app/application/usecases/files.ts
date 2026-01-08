import type { DialogFilter } from "../ports/dialogPort";
import { getTabById, updateTab, type AppState } from "../state/tabState";
import { openMapPath } from "./tabs";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";
import { formatTitle } from "./title";

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

export async function openFromDialog(
  state: AppState,
  deps: AppDependencies,
  filters: DialogFilter[]
): Promise<UsecaseResult> {
  const path = await deps.dialog.open({
    multiple: false,
    directory: false,
    filters
  });
  if (typeof path !== "string") return { state };
  return openMapPath(state, deps, path);
}

export async function saveMap(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  saveAs: boolean,
  filters: DialogFilter[]
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab) return { state };
  let path = tab.filePath;
  if (saveAs || !path) {
    path = await deps.dialog.save({
      filters,
      defaultPath: tab.filePath || undefined
    });
  }
  if (!path) return { state };
  const savedPath = await deps.mindmap.saveMap(tabId, path);
  const updatedTab = {
    ...tab,
    filePath: savedPath,
    title: fileNameFromPath(savedPath),
    isDirty: false
  };
  const nextState = updateTab(state, tabId, updatedTab);
  await deps.window.setTitle(formatTitle(updatedTab));
  return { state: nextState };
}
