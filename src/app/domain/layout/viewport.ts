import type { MindMap, Node } from "../../../types";
import type { LayoutConfig, Point, Viewport } from "./types";

function getNodeWidth(node: Node, config: LayoutConfig): number {
  const measured = config.measureNodeWidth(node);
  return Math.max(measured, config.minNodeWidth);
}

function getBounds(map: MindMap, config: LayoutConfig) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  Object.values(map.nodes).forEach((node) => {
    const w = getNodeWidth(node, config);
    const h = config.nodeHeight;
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + w);
    maxY = Math.max(maxY, node.y + h);
  });

  return { minX, minY, maxX, maxY };
}

export function computeFitOffset(
  map: MindMap,
  viewport: Viewport,
  config: LayoutConfig
): Point {
  const nodes = Object.values(map.nodes);
  if (nodes.length === 0) return { x: viewport.width / 2, y: viewport.height / 2 };
  const { minX, minY, maxX, maxY } = getBounds(map, config);
  const cx = minX + (maxX - minX) / 2;
  const cy = minY + (maxY - minY) / 2;
  return { x: viewport.width / 2 - cx, y: viewport.height / 2 - cy };
}

export function ensureVisible(
  map: MindMap,
  offset: Point,
  nodeId: string,
  viewport: Viewport,
  config: LayoutConfig
): Point {
  const node = map.nodes[nodeId];
  if (!node) return offset;
  const w = getNodeWidth(node, config);
  const h = config.nodeHeight;
  const padding = 50;
  const screenX = node.x + offset.x;
  const screenY = node.y + offset.y;
  const next = { x: offset.x, y: offset.y };

  if (screenX < padding) next.x += padding - screenX;
  if (screenY < padding) next.y += padding - screenY;
  if (screenX + w > viewport.width - padding) {
    next.x += viewport.width - padding - (screenX + w);
  }
  if (screenY + h > viewport.height - padding) {
    next.y += viewport.height - padding - (screenY + h);
  }

  return next;
}
