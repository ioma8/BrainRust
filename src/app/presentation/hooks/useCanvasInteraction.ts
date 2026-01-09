import { useCallback, useRef } from "preact/hooks";
import type { AppState, TabState } from "../../application/state/tabState";
import type { MindMap, Node } from "../../types";
import type { Point } from "../../domain/layout/types";
import { updateTab } from "../../application/state/tabState";
import { NODE_HEIGHT } from "../../domain/values/layout";

type EditorPosition = {
  left: number;
  top: number;
  width: number;
  height: number;
  content?: string;
};

type CanvasInteractionDeps = {
  getActiveTab: () => TabState | null;
  updateAppState: (updater: (state: AppState) => AppState) => void;
  renderCanvas: (map: MindMap, offset: Point) => void;
  getNodeAt: (map: MindMap, offset: Point, x: number, y: number) => Node | null;
  getCanvasPoint: (x: number, y: number) => { x: number; y: number; rect: DOMRect } | null;
  getNodeWidth: (node: Node) => number;
  openEditor: (map: MindMap, offset: Point, nodeId: string, position: EditorPosition) => void;
  getViewportSize: () => { width: number; height: number };
  onSelectNode: (nodeId: string) => Promise<void>;
};

export function useCanvasInteraction({
  getActiveTab,
  updateAppState,
  renderCanvas,
  getNodeAt,
  getCanvasPoint,
  getNodeWidth,
  openEditor,
  getViewportSize,
  onSelectNode
}: CanvasInteractionDeps) {
  const dragStateRef = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastOffset: { x: 0, y: 0 }
  });

  const defaultOffset = useCallback(() => {
    const viewport = getViewportSize();
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }, [getViewportSize]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    const dragState = dragStateRef.current;
    dragState.dragStart = { x: event.clientX, y: event.clientY };
    const activeTab = getActiveTab();
    dragState.lastOffset = activeTab?.offset ? { ...activeTab.offset } : defaultOffset();
    dragState.isDragging = false;

    if (!activeTab?.map) {
      dragState.isDragging = true;
      return;
    }
    const node = getNodeAt(activeTab.map, activeTab.offset, event.clientX, event.clientY);
    if (!node || node.id === activeTab.map.selected_node_id) {
      dragState.isDragging = true;
      return;
    }
    void onSelectNode(node.id);
  }, [defaultOffset, getActiveTab, getNodeAt, onSelectNode]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;
    const activeTab = getActiveTab();
    if (!activeTab) return;
    const dx = event.clientX - dragState.dragStart.x;
    const dy = event.clientY - dragState.dragStart.y;
    const nextOffset = {
      x: dragState.lastOffset.x + dx,
      y: dragState.lastOffset.y + dy
    };
    updateAppState((state) => updateTab(state, activeTab.id, { offset: nextOffset }));
    if (activeTab.map) {
      renderCanvas(activeTab.map, nextOffset);
    }
  }, [getActiveTab, renderCanvas, updateAppState]);

  const handleMouseUp = useCallback(() => {
    dragStateRef.current.isDragging = false;
  }, []);

  const handleDoubleClick = useCallback((event: MouseEvent) => {
    const activeTab = getActiveTab();
    if (!activeTab?.map) return;
    const node = getNodeAt(activeTab.map, activeTab.offset, event.clientX, event.clientY);
    if (!node) return;
    const point = getCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    const canvasX = node.x + activeTab.offset.x;
    const canvasY = node.y + activeTab.offset.y;
    openEditor(activeTab.map, activeTab.offset, node.id, {
      left: point.rect.left + canvasX,
      top: point.rect.top + canvasY,
      width: w,
      height: h,
      content: node.content
    });
  }, [getActiveTab, getCanvasPoint, getNodeAt, getNodeWidth, openEditor]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    dragStateRef
  };
}
