/**
 * @vitest-environment jsdom
 */
import { act } from "preact/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, flushPromises } from "./hookTestUtils";
import { useCloudState } from "../useCloudState";
import type { AppDependencies } from "../../../application/usecases/types";

const mockSession = {
  user: { id: "user-1", email: "test@example.com" }
};

vi.mock("../../../infrastructure/supabase/cloudApi", () => ({
  getSession: vi.fn(async () => mockSession),
  onAuthChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } }
  })),
  listMaps: vi.fn(async () => [
    { id: "m1", title: "Map", updatedAt: "2024-01-01" }
  ]),
  signIn: vi.fn(async () => mockSession),
  signUp: vi.fn(async () => mockSession),
  signOut: vi.fn(async () => undefined),
  loadMap: vi.fn(async () => ({
    id: "m1",
    title: "Map",
    updatedAt: "2024-01-01",
    content: {
      root_id: "root",
      selected_node_id: "root",
      nodes: {}
    }
  }))
}));

vi.mock("../../../application/usecases/cloud", () => ({
  openCloudMap: vi.fn(async (state) => ({ state }))
}));

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
      setTitle: async () => undefined,
      close: async () => undefined,
      destroy: async () => undefined
    }
  };
}

describe("useCloudState", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true
    });
  });

  it("loads session and maps", async () => {
    const hook = renderHook(() =>
      useCloudState({
        stateRef: { current: { tabs: [], activeTabId: null } },
        deps: makeDeps(),
        applyResult: vi.fn(),
        isSupabaseConfigured: true
      })
    );

    await flushPromises();

    expect(hook.result.cloudSession?.user.id).toBe("user-1");
    expect(hook.result.cloudMaps).toHaveLength(1);
    expect(hook.result.isCloudAvailable()).toBe(true);
  });

  it("tracks offline availability", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false
    });
    const hook = renderHook(() =>
      useCloudState({
        stateRef: { current: { tabs: [], activeTabId: null } },
        deps: makeDeps(),
        applyResult: vi.fn(),
        isSupabaseConfigured: true
      })
    );

    await flushPromises();

    expect(hook.result.isCloudAvailable()).toBe(false);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true
    });
    expect(hook.result.isCloudAvailable()).toBe(true);
  });
});
