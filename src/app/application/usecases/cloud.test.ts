import { describe, expect, it, vi } from "vitest";
import { openCloudMap } from "./cloud";
import type { AppDependencies } from "./types";
import type { AppState } from "../state/tabState";
import type { MindMap } from "../../../types";

function makeDeps(): AppDependencies {
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
    mapFile: {
      loadMap: async () => ({
        root_id: "root",
        selected_node_id: "root",
        nodes: {}
      }),
      saveMap: async (path) => path
    },
    dialog: {
      open: async () => null,
      save: async () => null,
      confirm: async () => true,
      ask: async () => undefined
    },
    window: {
      setTitle: vi.fn(),
      close: async () => undefined,
      destroy: async () => undefined
    },
    cloud: {
      getSession: vi.fn(),
      onAuthChange: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      listMaps: vi.fn(),
      loadMap: vi.fn(),
      saveMap: vi.fn()
    }
  };
}

function makeState(): AppState {
  return {
    tabs: [],
    activeTabId: null
  };
}

function makeMap(): MindMap {
  return {
    root_id: "root",
    selected_node_id: "root",
    nodes: {
      root: {
        id: "root",
        content: "Root",
        parent: null,
        x: 0,
        y: 0,
        children: [],
        icons: [],
        created: Date.now(),
        modified: Date.now()
      }
    }
  };
}

describe("openCloudMap", () => {
  it("creates a new cloud tab with the map", async () => {
    const state = makeState();
    const deps = makeDeps();
    const map = makeMap();
    const title = "Cloud Map";
    const cloudId = "cloud-123";

    const result = await openCloudMap(state, deps, title, map, cloudId);

    expect(result.state.tabs).toHaveLength(1);
    const tab = result.state.tabs[0];
    expect(tab.id).toBe("tab-1");
    expect(tab.title).toBe(title);
    expect(tab.cloudId).toBe(cloudId);
    expect(tab.storageTarget).toBe("cloud");
    expect(tab.filePath).toBe(null);
    expect(tab.isDirty).toBe(false);
  });

  it("sets the active tab to the new cloud tab", async () => {
    const state = makeState();
    const deps = makeDeps();
    const map = makeMap();

    const result = await openCloudMap(state, deps, "Map", map, "cloud-1");

    expect(result.state.activeTabId).toBe("tab-1");
  });

  it("applies layout to the map", async () => {
    const state = makeState();
    const deps = makeDeps();
    const map = makeMap();

    const result = await openCloudMap(state, deps, "Map", map, "cloud-1");

    expect(result.state.tabs[0].map).not.toBe(map); // map is laid out
    expect(result.state.tabs[0].map?.nodes.root).toBeDefined();
  });

  it("sets the window title", async () => {
    const state = makeState();
    const deps = makeDeps();
    const map = makeMap();

    await openCloudMap(state, deps, "My Map", map, "cloud-1");

    expect(deps.window.setTitle).toHaveBeenCalledWith("My Map");
  });

  it("returns render payload with laid out map and offset", async () => {
    const state = makeState();
    const deps = makeDeps();
    const map = makeMap();

    const result = await openCloudMap(state, deps, "Map", map, "cloud-1");

    expect(result.render).toBeDefined();
    expect(result.render?.map).toBeDefined();
    // Offset is computed to fit the map, so just verify it's reasonable
    expect(result.render?.offset.x).toBeGreaterThan(0);
    expect(result.render?.offset.y).toBeGreaterThan(0);
  });
});
