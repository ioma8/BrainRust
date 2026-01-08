import type { MindMap } from "../../../types";

export type MindMapPort = {
  newMap: (tabId: string) => Promise<MindMap>;
  getMap: (tabId: string) => Promise<MindMap>;
  loadMap: (tabId: string, path: string) => Promise<MindMap>;
  saveMap: (tabId: string, path: string) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  addChild: (tabId: string, parentId: string, content: string) => Promise<MindMap>;
  addSibling: (tabId: string, nodeId: string, content: string) => Promise<MindMap>;
  removeNode: (tabId: string, nodeId: string) => Promise<MindMap>;
  changeNode: (tabId: string, nodeId: string, content: string) => Promise<MindMap>;
  navigate: (tabId: string, direction: string) => Promise<string>;
  selectNode: (tabId: string, nodeId: string) => Promise<string>;
  addIcon: (tabId: string, nodeId: string, icon: string) => Promise<MindMap>;
  removeLastIcon: (tabId: string, nodeId: string) => Promise<MindMap>;
};
