import { invoke } from "@tauri-apps/api/core";
import type { MindMap } from "../../../types";

export function newMap(tabId: string) {
  return invoke<MindMap>("new_map", { tabId });
}

export function getMap(tabId: string) {
  return invoke<MindMap>("get_map", { tabId });
}

export function loadMap(tabId: string, path: string) {
  return invoke<MindMap>("load_map", { tabId, path });
}

export function saveMap(tabId: string, path: string) {
  return invoke<string>("save_map", { tabId, path });
}

export function closeTab(tabId: string) {
  return invoke<void>("close_tab", { tabId });
}

export function addChild(tabId: string, parentId: string, content: string) {
  return invoke<MindMap>("add_child", { tabId, parentId, content });
}

export function addSibling(tabId: string, nodeId: string, content: string) {
  return invoke<MindMap>("add_sibling", { tabId, nodeId, content });
}

export function removeNode(tabId: string, nodeId: string) {
  return invoke<MindMap>("remove_node", { tabId, nodeId });
}

export function changeNode(tabId: string, nodeId: string, content: string) {
  return invoke<MindMap>("change_node", { tabId, nodeId, content });
}

export function navigate(tabId: string, direction: string) {
  return invoke<string>("navigate", { tabId, direction });
}

export function selectNode(tabId: string, nodeId: string) {
  return invoke<string>("select_node", { tabId, nodeId });
}

export function addIcon(tabId: string, nodeId: string, icon: string) {
  return invoke<MindMap>("add_icon", { tabId, nodeId, icon });
}

export function removeLastIcon(tabId: string, nodeId: string) {
  return invoke<MindMap>("remove_last_icon", { tabId, nodeId });
}
