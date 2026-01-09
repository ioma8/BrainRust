import type { MindMap, Node } from "../../../types";
import type { Point } from "../../domain/layout/types";
import type { RenderNode } from "./renderPlan";

type OverlayConfig = {
  nodeHeight: number;
  getNodeWidth: (node: Node) => number;
};

export function buildSelectedNodeOverlay(
  map: MindMap,
  offset: Point,
  config: OverlayConfig
): RenderNode | null {
  const selectedId = map.selected_node_id;
  const selected = map.nodes[selectedId];
  if (!selected) return null;
  const width = config.getNodeWidth(selected);
  return {
    id: selected.id,
    content: selected.content,
    icons: selected.icons,
    x: selected.x + offset.x,
    y: selected.y + offset.y,
    width,
    height: config.nodeHeight,
    isSelected: true
  };
}

