/**
 * @vitest-environment jsdom
 */
import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import { renderHook } from "./hookTestUtils";
import { useAppState } from "../useAppState";
import type { AppDependencies } from "../../../application/usecases/types";

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
        nodes: {
          root: {
            id: "root",
            content: "Central Node",
            children: [],
            parent: null,
            x: 0,
            y: 0,
            icons: [],
            created: 0,
            modified: 0
          }
        }
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
      setTitle: async () => undefined,
      close: async () => undefined,
      destroy: async () => undefined
    }
  };
}

describe("useAppState", () => {
  it("creates a new tab and updates active tab", async () => {
    const deps = makeDeps();
    const renderSpy = () => undefined;
    const hook = renderHook(() => useAppState(deps, renderSpy));

    await act(async () => {
      await hook.result.createNewTab();
    });

    expect(hook.result.appState.tabs).toHaveLength(1);
    expect(hook.result.appState.activeTabId).toBeDefined();
  });
});
