import { describe, expect, it } from "vitest";
import type { AppDependencies } from "./types";
import type { AppState, TabState } from "../state/tabState";
import { confirmCloseApp } from "./appClose";

function makeTab(isDirty: boolean): TabState {
  return {
    id: "tab-1",
    title: "Doc",
    filePath: null,
    isDirty,
    map: null,
    offset: { x: 0, y: 0 }
  };
}

function makeDeps(confirmResult: boolean): AppDependencies {
  return {
    id: { nextId: () => "tab-1" },
    layout: {
      getLayoutConfig: () => ({
        nodeHeight: 30,
        hGap: 50,
        vGap: 20,
        minNodeWidth: 100,
        measureNodeWidth: () => 100
      }),
      getViewport: () => ({ width: 800, height: 600 })
    },
    mindmap: {
      newMap: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      getMap: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      loadMap: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      saveMap: async () => "saved.mm",
      closeTab: async () => undefined,
      addChild: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      addSibling: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      removeNode: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      changeNode: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      navigate: async () => "root",
      selectNode: async () => "root",
      addIcon: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} }),
      removeLastIcon: async () => ({ root_id: "root", selected_node_id: "root", nodes: {} })
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      confirm: async () => confirmResult,
      ask: async () => undefined
    },
    window: {
      setTitle: async () => undefined,
      close: async () => undefined,
      destroy: async () => undefined
    }
  };
}

describe("confirmCloseApp", () => {
  it("returns true when no dirty tabs", async () => {
    const state: AppState = { tabs: [makeTab(false)], activeTabId: "tab-1" };
    const deps = makeDeps(false);

    const result = await confirmCloseApp(state, deps);

    expect(result).toBe(true);
  });

  it("prompts when there are dirty tabs", async () => {
    const state: AppState = { tabs: [makeTab(true)], activeTabId: "tab-1" };
    const deps = makeDeps(true);

    const result = await confirmCloseApp(state, deps);

    expect(result).toBe(true);
  });
});
