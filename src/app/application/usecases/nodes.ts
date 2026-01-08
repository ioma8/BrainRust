import { getTabById, markTabDirty, updateTab, type AppState } from "../state/tabState";
import type { AppDependencies } from "./types";
import type { UsecaseResult } from "./result";
import { ensureVisibleOffset, layoutMap } from "./layout";
import { formatTitle } from "./title";
import { addChild, addIcon, addSibling, changeNode as changeNodeDomain, removeLastIcon, removeNode, selectNode } from "../../domain/mindmap/mindmap";

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
  const result = resolvedMode === "child"
    ? addChild(tab.map, tab.map.selected_node_id, "New Node")
    : addSibling(tab.map, tab.map.selected_node_id, "New Node");
  const selectedMap = selectNode(result.map, result.newId);
  const { map: laidOutMap, offset } = layoutMap(selectedMap, deps.layout, false, tab.offset);
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
  const map = removeNode(tab.map, tab.map.selected_node_id);
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
  const map = changeNodeDomain(tab.map, nodeId, content);
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
    ? removeLastIcon(tab.map, nodeId)
    : addIcon(tab.map, nodeId, icon);
  const { map: laidOutMap, offset } = layoutMap(map, deps.layout, false, tab.offset);
  const updatedTab = { ...tab, map: laidOutMap, offset };
  let nextState = updateTab(state, tabId, updatedTab);
  nextState = markTabDirty(nextState, tabId);
  await deps.window.setTitle(formatTitle({ ...updatedTab, isDirty: true }));
  return { state: nextState, render: { map: laidOutMap, offset } };
}
