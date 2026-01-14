/* @vitest-environment jsdom */
import { act } from "preact/test-utils";
import { expect, test, vi } from "vitest";
import { renderHook, flushPromises } from "./hookTestUtils";
import { useFileOperations } from "../useFileOperations";
import type { AppDependencies } from "../../../application/usecases/types";

const openFromDialog = vi.fn();
const saveMap = vi.fn();
const formatTitle = vi.fn(() => "BrainRust");

const mockCloudPort = {
  getSession: vi.fn(),
  onAuthChange: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  listMaps: vi.fn(),
  loadMap: vi.fn(),
  saveMap: vi.fn()
};

vi.mock("../../../application/usecases/files", () => ({
  openFromDialog: (...args: unknown[]) => openFromDialog(...args),
  saveMap: (...args: unknown[]) => saveMap(...args)
}));

vi.mock("../../../application/usecases/title", () => ({
  formatTitle: (...args: unknown[]) => formatTitle(...args)
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
    },
    cloud: mockCloudPort
  };
}

function makeTab(overrides: Partial<any> = {}) {
  return {
    id: "tab-1",
    title: "Untitled",
    map: {
      root_id: "root",
      selected_node_id: "root",
      nodes: {}
    },
    offset: { x: 0, y: 0 },
    filePath: "/tmp/map.mm",
    isDirty: true,
    storageTarget: "local",
    cloudId: null,
    ...overrides
  };
}

test("opens map from dialog", async () => {
  const state = { tabs: [], activeTabId: null };
  const result = { state };
  openFromDialog.mockResolvedValueOnce(result);
  const applyResult = vi.fn();

  const hook = renderHook(() =>
    useFileOperations({
      stateRef: { current: state },
      deps: makeDeps(),
      applyResult,
      updateAppState: vi.fn(),
      getActiveTab: vi.fn(),
      saveFilters: [],
      openFilters: [],
      cloudSessionRef: { current: null },
      runCloudAction: async (action) => action(),
      refreshCloudMaps: async () => undefined,
      isCloudAvailable: () => false,
      isOffline: () => false,
      setCloudError: vi.fn()
    })
  );

  await hook.result.openMap();

  expect(openFromDialog).toHaveBeenCalledTimes(1);
  expect(applyResult).toHaveBeenCalledWith(result);
});

test("saves local map when target is local", async () => {
  const tab = makeTab();
  const state = { tabs: [tab], activeTabId: tab.id };
  saveMap.mockResolvedValueOnce({ state });

  const hook = renderHook(() =>
    useFileOperations({
      stateRef: { current: state },
      deps: makeDeps(),
      applyResult: vi.fn(),
      updateAppState: vi.fn(),
      getActiveTab: () => tab,
      saveFilters: [{ name: "MindMap", extensions: ["mm"] }],
      openFilters: [],
      cloudSessionRef: { current: null },
      runCloudAction: async (action) => action(),
      refreshCloudMaps: async () => undefined,
      isCloudAvailable: () => false,
      isOffline: () => false,
      setCloudError: vi.fn()
    })
  );

  await hook.result.saveActiveTab(false);

  expect(saveMap).toHaveBeenCalledWith(state, expect.any(Object), tab.id, false, [
    { name: "MindMap", extensions: ["mm"] }
  ]);
});

test("prompts for target and saves local for new files", async () => {
  const tab = makeTab({ storageTarget: null, filePath: null });
  const state = { tabs: [tab], activeTabId: tab.id };
  saveMap.mockResolvedValueOnce({ state });

  const hook = renderHook(() =>
    useFileOperations({
      stateRef: { current: state },
      deps: makeDeps(),
      applyResult: vi.fn(),
      updateAppState: vi.fn(),
      getActiveTab: () => tab,
      saveFilters: [],
      openFilters: [],
      cloudSessionRef: { current: null },
      runCloudAction: async (action) => action(),
      refreshCloudMaps: async () => undefined,
      isCloudAvailable: () => true,
      isOffline: () => false,
      setCloudError: vi.fn()
    })
  );

  const savePromise = hook.result.saveActiveTab(false);
  act(() => hook.result.resolveSaveTarget("local"));
  await savePromise;

  expect(saveMap).toHaveBeenCalledWith(state, expect.any(Object), tab.id, true, []);
});

test("saves existing cloud map and updates title", async () => {
  const tab = makeTab({ storageTarget: "cloud", cloudId: "cloud-1", filePath: null });
  const state = { tabs: [tab], activeTabId: tab.id };
  const deps = makeDeps();
  const updateAppState = vi.fn();
  const setTitle = vi.spyOn(deps.window, "setTitle");

  mockCloudPort.saveMap.mockResolvedValueOnce({ id: "cloud-1", title: "Untitled", updatedAt: "2024-01-01" });

  const hook = renderHook(() =>
    useFileOperations({
      stateRef: { current: state },
      deps,
      applyResult: vi.fn(),
      updateAppState,
      getActiveTab: () => tab,
      saveFilters: [],
      openFilters: [],
      cloudSessionRef: { current: { user: { id: "user-1" } } },
      runCloudAction: async (action) => action(),
      refreshCloudMaps: async () => undefined,
      isCloudAvailable: () => true,
      isOffline: () => false,
      setCloudError: vi.fn()
    })
  );

  await hook.result.saveActiveTab(false);
  await flushPromises();

  expect(mockCloudPort.saveMap).toHaveBeenCalledWith("cloud-1", "Untitled", tab.map, "user-1");
  expect(updateAppState).toHaveBeenCalledTimes(1);
  expect(setTitle).toHaveBeenCalledWith("BrainRust");
});
