import type { MindMap, Node } from "../../../types";
import type { Point } from "../../domain/layout/types";

export type RenderNode = {
  id: string;
  content: string;
  icons: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
};

export type RenderEdge = {
  fromId: string;
  toId: string;
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
};

export type RenderPlan = {
  nodes: RenderNode[];
  edges: RenderEdge[];
};

type RenderConfig = {
  nodeHeight: number;
  getNodeWidth: (node: Node) => number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildRenderPlan(
  map: MindMap,
  offset: Point,
  config: RenderConfig,
  selectedOverride?: string | null
): RenderPlan {
  const selectedId = selectedOverride === undefined ? map.selected_node_id : selectedOverride;
  const nodes = Object.values(map.nodes).map((node) => {
    const width = config.getNodeWidth(node);
    return {
      id: node.id,
      content: node.content,
      icons: node.icons,
      x: node.x + offset.x,
      y: node.y + offset.y,
      width,
      height: config.nodeHeight,
      isSelected: Boolean(selectedId && node.id === selectedId)
    };
  });

  const edges: RenderEdge[] = [];
  Object.values(map.nodes).forEach((node) => {
    if (!node.parent || !map.nodes[node.parent]) return;
    const parent = map.nodes[node.parent];
    const parentWidth = config.getNodeWidth(parent);
    const start = {
      x: parent.x + offset.x + parentWidth,
      y: parent.y + offset.y + config.nodeHeight / 2
    };
    const end = {
      x: node.x + offset.x,
      y: node.y + offset.y + config.nodeHeight / 2
    };
    const dx = end.x - start.x;
    const trunk = clamp(Math.abs(dx) * 0.45, 30, 120);
    const cp1 = { x: start.x + trunk, y: start.y };
    const cp2 = { x: start.x + trunk, y: end.y };
    edges.push({
      fromId: parent.id,
      toId: node.id,
      start,
      cp1,
      cp2,
      end
    });
  });

  return { nodes, edges };
}
