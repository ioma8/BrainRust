import type { MindMap, Node } from "../../../types";
import type { LayoutConfig, Point } from "./types";

function getNodeWidth(node: Node, config: LayoutConfig): number {
  const measured = config.measureNodeWidth(node);
  return Math.max(measured, config.minNodeWidth);
}

function isPointInside(
  point: Point,
  node: Node,
  config: LayoutConfig
): boolean {
  const w = getNodeWidth(node, config);
  const h = config.nodeHeight;
  return (
    point.x >= node.x &&
    point.x <= node.x + w &&
    point.y >= node.y &&
    point.y <= node.y + h
  );
}

export function screenToWorld(point: Point, offset: Point): Point {
  return { x: point.x - offset.x, y: point.y - offset.y };
}

export function getNodeAt(
  map: MindMap,
  offset: Point,
  canvasPoint: Point,
  config: LayoutConfig
): Node | null {
  const point = screenToWorld(canvasPoint, offset);
  const nodes = Object.values(map.nodes);
  for (const node of nodes) {
    if (isPointInside(point, node, config)) return node;
  }
  return null;
}
