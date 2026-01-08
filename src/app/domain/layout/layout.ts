import type { MindMap, Node } from "../../../types";
import type { LayoutConfig } from "./types";

function cloneNode(node: Node): Node {
  return {
    ...node,
    children: [...node.children],
    icons: [...node.icons]
  };
}

function cloneMap(map: MindMap): MindMap {
  const nodes: Record<string, Node> = {};
  Object.entries(map.nodes).forEach(([id, node]) => {
    nodes[id] = cloneNode(node);
  });
  return { ...map, nodes };
}

function getNodeWidth(node: Node, config: LayoutConfig): number {
  const measured = config.measureNodeWidth(node);
  return Math.max(measured, config.minNodeWidth);
}

function rowHeight(config: LayoutConfig): number {
  return config.nodeHeight + config.vGap;
}

function shiftToRoot(map: MindMap, prevRoot: { x: number; y: number }) {
  const root = map.nodes[map.root_id];
  if (!root) return map;
  const dx = prevRoot.x - root.x;
  const dy = prevRoot.y - root.y;
  if (dx === 0 && dy === 0) return map;
  Object.values(map.nodes).forEach((node) => {
    node.x += dx;
    node.y += dy;
  });
  return map;
}

function layoutChildren(
  map: MindMap,
  node: Node,
  x: number,
  startY: number,
  config: LayoutConfig
): number {
  const childX = x + getNodeWidth(node, config) + config.hGap;
  let currentY = startY;
  node.children.forEach((childId) => {
    if (!map.nodes[childId]) return;
    currentY += layoutNode(map, childId, childX, currentY, config);
  });
  return Math.max(currentY - startY, rowHeight(config));
}

function layoutNode(
  map: MindMap,
  nodeId: string,
  x: number,
  startY: number,
  config: LayoutConfig
): number {
  const node = map.nodes[nodeId];
  if (!node) return rowHeight(config);
  if (node.children.length === 0) {
    node.x = x;
    node.y = startY;
    return rowHeight(config);
  }
  const totalHeight = layoutChildren(map, node, x, startY, config);
  node.x = x;
  node.y = startY + (totalHeight - rowHeight(config)) / 2;
  return totalHeight;
}

export function computeLayout(map: MindMap, config: LayoutConfig): MindMap {
  const next = cloneMap(map);
  const root = map.nodes[map.root_id];
  const prevRoot = { x: root?.x ?? 0, y: root?.y ?? 0 };
  layoutNode(next, next.root_id, 0, 0, config);
  return shiftToRoot(next, prevRoot);
}
