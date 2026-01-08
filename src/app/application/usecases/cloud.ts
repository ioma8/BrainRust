import type { MindMap } from "../../../types";
import { addTab, updateTab, type AppState, type TabState } from "../state/tabState";
import { defaultOffset, layoutMap } from "./layout";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";
import { formatTitle } from "./title";

function createCloudTab(tabId: string, title: string, offset: { x: number; y: number }, cloudId: string) {
  return {
    id: tabId,
    title,
    filePath: null,
    storageTarget: "cloud" as const,
    isDirty: false,
    map: null,
    offset,
    cloudId
  };
}

export async function openCloudMap(
  state: AppState,
  deps: AppDependencies,
  title: string,
  map: MindMap,
  cloudId: string
): Promise<UsecaseResult> {
  const tabId = deps.id.nextId();
  const baseOffset = defaultOffset(deps.layout);
  const tab = createCloudTab(tabId, title, baseOffset, cloudId);
  let nextState = addTab(state, tab, true);
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, true, baseOffset);
  const updatedTab: TabState = { ...tab, map: laidOutMap, offset };
  nextState = updateTab(nextState, tabId, updatedTab);
  await deps.window.setTitle(formatTitle(updatedTab));
  return { state: nextState, render: { map: laidOutMap, offset } };
}
