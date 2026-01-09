import { expect, test } from "vitest";
import type { AppDependencies } from "./types";
import type { AppState } from "../state/tabState";
import { relayoutAllTabs } from "./relayout";

function makeDeps(): AppDependencies {
  return {
    id: { nextId: () => "tab-x" },
    layout: {
      getViewport: () => ({ width: 2000, height: 2000 }),
      getLayoutConfig: () => ({
        nodeHeight: 30,
        hGap: 50,
        vGap: 20,
        minNodeWidth: 100,
        measureNodeWidth: () => 100
      })
    },
    mapFile: {
      loadMap: async () => {
        throw new Error("not used");
      },
      saveMap: async () => {
        throw new Error("not used");
      }
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      confirm: async () => true,
      ask: async () => undefined
    },
    window: {
      setTitle: async () => undefined,
      close: async () => undefined,
      destroy: async () => undefined
    }
  };
}

test("relayoutAllTabs recomputes layout and returns render for active tab", () => {
  const deps = makeDeps();
  const map = {
    root_id: "root",
    selected_node_id: "root",
    nodes: {
      root: {
        id: "root",
        content: "Root",
        children: ["child"],
        parent: null,
        x: 100,
        y: 50,
        created: 0,
        modified: 0,
        icons: []
      },
      child: {
        id: "child",
        content: "Child",
        children: [],
        parent: "root",
        x: 0,
        y: 0,
        created: 0,
        modified: 0,
        icons: []
      }
    }
  };

  const state: AppState = {
    tabs: [
      {
        id: "t1",
        title: "One",
        filePath: null,
        storageTarget: null,
        isDirty: false,
        map,
        offset: { x: 0, y: 0 },
        cloudId: null
      },
      {
        id: "t2",
        title: "Two",
        filePath: null,
        storageTarget: null,
        isDirty: false,
        map,
        offset: { x: 0, y: 0 },
        cloudId: null
      }
    ],
    activeTabId: "t1"
  };

  const result = relayoutAllTabs(state, deps);
  const t1 = result.state.tabs.find((tab) => tab.id === "t1")!;
  expect(t1.map?.nodes.root.x).toBe(100);
  expect(t1.map?.nodes.child.x).toBeGreaterThan(100);
  expect(result.render?.map).toBeTruthy();
});

