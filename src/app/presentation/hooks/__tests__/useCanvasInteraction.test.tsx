/* @vitest-environment jsdom */
import { expect, test, vi } from "vitest";
import { renderHook } from "./hookTestUtils";
import { useCanvasInteraction } from "../useCanvasInteraction";
import { NODE_HEIGHT } from "../../../domain/values/layout";

const baseMap = {
  selected_node_id: "root",
  nodes: {
    root: { id: "root", parent: null, x: 0, y: 0, content: "Root", icons: [] }
  }
};

test("selects node on mouse down", async () => {
  const onSelectNode = vi.fn().mockResolvedValue(undefined);
  const getActiveTab = vi.fn(() => ({
    id: "tab-1",
    map: baseMap,
    offset: { x: 0, y: 0 }
  }));

  const { result } = renderHook(() =>
    useCanvasInteraction({
      getActiveTab,
      updateAppState: vi.fn(),
      renderCanvas: vi.fn(),
      getNodeAt: vi.fn(() => ({ id: "child" })),
      getCanvasPoint: vi.fn(),
      getNodeWidth: vi.fn(),
      openEditor: vi.fn(),
      getViewportSize: () => ({ width: 400, height: 300 }),
      onSelectNode
    })
  );

  result.handleMouseDown(new MouseEvent("mousedown", { clientX: 10, clientY: 20 }));

  expect(onSelectNode).toHaveBeenCalledWith("child");
});

test("drags map to update offset", () => {
  const renderCanvas = vi.fn();
  const updateAppState = vi.fn();
  const tab = {
    id: "tab-1",
    map: baseMap,
    offset: { x: 10, y: 20 }
  };
  const getActiveTab = vi.fn(() => tab);

  const { result } = renderHook(() =>
    useCanvasInteraction({
      getActiveTab,
      updateAppState,
      renderCanvas,
      getNodeAt: vi.fn(() => null),
      getCanvasPoint: vi.fn(),
      getNodeWidth: vi.fn(),
      openEditor: vi.fn(),
      getViewportSize: () => ({ width: 400, height: 300 }),
      onSelectNode: vi.fn()
    })
  );

  result.handleMouseDown(new MouseEvent("mousedown", { clientX: 0, clientY: 0 }));
  result.handleMouseMove(new MouseEvent("mousemove", { clientX: 10, clientY: 5 }));

  expect(updateAppState).toHaveBeenCalledTimes(1);
  expect(renderCanvas).toHaveBeenCalledWith(baseMap, { x: 20, y: 25 });
});

test("opens editor on double click", () => {
  const openEditor = vi.fn();
  const node = { id: "child", parent: "root", x: 30, y: 40, content: "Hello", icons: [] };
  const map = {
    ...baseMap,
    nodes: { ...baseMap.nodes, child: node }
  };
  const getActiveTab = vi.fn(() => ({
    id: "tab-1",
    map,
    offset: { x: 10, y: 20 }
  }));

  const { result } = renderHook(() =>
    useCanvasInteraction({
      getActiveTab,
      updateAppState: vi.fn(),
      renderCanvas: vi.fn(),
      getNodeAt: vi.fn(() => node),
      getCanvasPoint: vi.fn(() => ({ x: 0, y: 0, rect: { left: 100, top: 200 } })),
      getNodeWidth: vi.fn(() => 120),
      openEditor,
      getViewportSize: () => ({ width: 400, height: 300 }),
      onSelectNode: vi.fn()
    })
  );

  result.handleDoubleClick(new MouseEvent("dblclick", { clientX: 10, clientY: 20 }));

  expect(openEditor).toHaveBeenCalledWith(
    map,
    { x: 10, y: 20 },
    "child",
    expect.objectContaining({
      left: 140,
      top: 260,
      width: 120,
      height: NODE_HEIGHT,
      content: "Hello"
    })
  );
});
