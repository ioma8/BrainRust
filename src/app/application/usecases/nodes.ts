import { getTabById, markTabDirty, updateTab, type AppState } from "../state/tabState";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";
import { ensureVisibleOffset, layoutMap } from "./layout";
import { formatTitle } from "./title";

type NodeMode = "child" | "sibling";

export async function addNode(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  mode: NodeMode
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  const isRootSelected = tab.map.selected_node_id === tab.map.root_id;
  const resolvedMode = mode === "sibling" && isRootSelected ? "child" : mode;
  const map = resolvedMode === "child"
    ? await deps.mindmap.addChild(tab.id, tab.map.selected_node_id, "New Node")
    : await deps.mindmap.addSibling(tab.id, tab.map.selected_node_id, "New Node");
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, false, tab.offset);
  const visibleOffset = ensureVisibleOffset(
    laidOutMap,
    deps.layout,
    offset,
    laidOutMap.selected_node_id
  );
  const updatedTab = { ...tab, map: laidOutMap, offset: visibleOffset };
  let nextState = updateTab(state, tabId, updatedTab);
  nextState = markTabDirty(nextState, tabId);
  await deps.window.setTitle(formatTitle({ ...updatedTab, isDirty: true }));
  return { state: nextState, render: { map: laidOutMap, offset: visibleOffset } };
}

export async function removeSelectedNode(
  state: AppState,
  deps: AppDependencies,
  tabId: string
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  if (tab.map.selected_node_id === tab.map.root_id) return { state };
  const map = await deps.mindmap.removeNode(tabId, tab.map.selected_node_id);
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, false, tab.offset);
  const updatedTab = { ...tab, map: laidOutMap, offset };
  let nextState = updateTab(state, tabId, updatedTab);
  nextState = markTabDirty(nextState, tabId);
  await deps.window.setTitle(formatTitle({ ...updatedTab, isDirty: true }));
  return { state: nextState, render: { map: laidOutMap, offset } };
}

export async function changeNode(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  nodeId: string,
  content: string
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  const map = await deps.mindmap.changeNode(tabId, nodeId, content);
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, false, tab.offset);
  const updatedTab = { ...tab, map: laidOutMap, offset };
  let nextState = updateTab(state, tabId, updatedTab);
  nextState = markTabDirty(nextState, tabId);
  await deps.window.setTitle(formatTitle({ ...updatedTab, isDirty: true }));
  return { state: nextState, render: { map: laidOutMap, offset } };
}

export async function updateIcon(
  state: AppState,
  deps: AppDependencies,
  tabId: string,
  icon: string
): Promise<UsecaseResult> {
  const tab = getTabById(state, tabId);
  if (!tab?.map) return { state };
  const nodeId = tab.map.selected_node_id;
  const map = icon === "trash"
    ? await deps.mindmap.removeLastIcon(tabId, nodeId)
    : await deps.mindmap.addIcon(tabId, nodeId, icon);
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, false, tab.offset);
  const updatedTab = { ...tab, map: laidOutMap, offset };
  let nextState = updateTab(state, tabId, updatedTab);
  nextState = markTabDirty(nextState, tabId);
  await deps.window.setTitle(formatTitle({ ...updatedTab, isDirty: true }));
  return { state: nextState, render: { map: laidOutMap, offset } };
}
