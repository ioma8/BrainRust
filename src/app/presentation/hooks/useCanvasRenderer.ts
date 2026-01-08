import { useRef } from "preact/hooks";
import type { MindMap, Node } from "../../../types";
import { getNodeAt as hitTestNode } from "../../domain/layout/geometry";
import type { LayoutConfig, Point, Viewport } from "../../domain/layout/types";
import { H_GAP, MIN_NODE_WIDTH, NODE_HEIGHT, V_GAP } from "../../domain/values/layout";
import type { ThemeColors } from "../theme/theme";
import { iconMap } from "../constants/icons";
import { EMOJI_FONT, NODE_FONT } from "../constants/typography";
const ICON_SPACING = 20;
const TEXT_PADDING = 20;

export function useCanvasRenderer(themeColorsRef: { current: ThemeColors }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const viewportRef = useRef({ width: 0, height: 0 });

  function measureNodeWidth(node: Node): number {
    const ctx = ctxRef.current;
    if (!ctx) return MIN_NODE_WIDTH;
    ctx.font = NODE_FONT;
    const textW = ctx.measureText(node.content).width;
    const iconsW = node.icons.length * ICON_SPACING;
    return textW + iconsW + TEXT_PADDING;
  }

  function getLayoutConfig(): LayoutConfig {
    return {
      nodeHeight: NODE_HEIGHT,
      hGap: H_GAP,
      vGap: V_GAP,
      minNodeWidth: MIN_NODE_WIDTH,
      measureNodeWidth
    };
  }

  function getNodeWidth(node: Node): number {
    return Math.max(measureNodeWidth(node), MIN_NODE_WIDTH);
  }

  function getViewportSize(): Viewport {
    const { width, height } = viewportRef.current;
    if (width > 0 && height > 0) return { width, height };
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    viewportRef.current = { width: rect.width, height: rect.height };
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;
    }
  }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function applyNodeShadow(ctx: CanvasRenderingContext2D, isSelected: boolean, colors: ThemeColors) {
    if (isSelected) {
      ctx.shadowColor = colors.nodeSelectedGlow;
      ctx.shadowBlur = 10;
      return;
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  function drawNodeShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    colors: ThemeColors,
    isSelected: boolean
  ) {
    ctx.fillStyle = isSelected ? colors.nodeSelected : colors.node;
    applyNodeShadow(ctx, isSelected, colors);
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = isSelected ? colors.nodeBorderSelected : colors.nodeBorder;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();
  }

  function drawNodeText(
    ctx: CanvasRenderingContext2D,
    node: Node,
    x: number,
    y: number,
    h: number,
    colors: ThemeColors,
    isSelected: boolean
  ) {
    ctx.fillStyle = isSelected ? colors.textSelected : colors.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let currentX = x + 10;
    node.icons.forEach((iconName) => {
      const emoji = iconMap[iconName] || "?";
      ctx.font = EMOJI_FONT;
      ctx.fillText(emoji, currentX, y + h / 2 + 1);
      currentX += ICON_SPACING;
    });
    ctx.font = NODE_FONT;
    ctx.fillText(node.content, currentX, y + h / 2);
  }

  function drawNode(node: Node, isSelected: boolean, offset: Point) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const w = getNodeWidth(node);
    const h = NODE_HEIGHT;
    const x = node.x + offset.x;
    const y = node.y + offset.y;
    const colors = themeColorsRef.current;
    drawNodeShape(ctx, x, y, w, h, colors, isSelected);
    drawNodeText(ctx, node, x, y, h, colors, isSelected);
  }

  function drawEdges(map: MindMap, offset: Point) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const colors = themeColorsRef.current;
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    Object.values(map.nodes).forEach((node) => {
      if (!node.parent || !map.nodes[node.parent]) return;
      const parent = map.nodes[node.parent];
      const pW = getNodeWidth(parent);
      const pCx = parent.x + offset.x + pW;
      const pCy = parent.y + offset.y + NODE_HEIGHT / 2;
      const cCx = node.x + offset.x;
      const cCy = node.y + offset.y + NODE_HEIGHT / 2;
      const dx = cCx - pCx;
      const trunk = clamp(Math.abs(dx) * 0.45, 30, 120);
      const cp1x = pCx + trunk;
      const cp2x = pCx + trunk;

      ctx.beginPath();
      ctx.moveTo(pCx, pCy);
      ctx.bezierCurveTo(cp1x, pCy, cp2x, cCy, cCx, cCy);
      ctx.stroke();
    });
  }

  function renderCanvas(map: MindMap, offset: Point) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    let { width, height } = viewportRef.current;
    if (width <= 0 || height <= 0) {
      resizeCanvas();
      ({ width, height } = viewportRef.current);
      if (width <= 0 || height <= 0) return;
    }
    const colors = themeColorsRef.current;
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);
    drawEdges(map, offset);
    Object.values(map.nodes).forEach((node) => {
      drawNode(node, node.id === map.selected_node_id, offset);
    });
  }

  function getCanvasPoint(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top, rect };
  }

  function getNodeAt(map: MindMap, offset: Point, clientX: number, clientY: number) {
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return null;
    return hitTestNode(map, offset, { x: point.x, y: point.y }, getLayoutConfig());
  }

  return {
    canvasRef,
    getLayoutConfig,
    getNodeWidth,
    getViewportSize,
    getCanvasPoint,
    getNodeAt,
    renderCanvas,
    resizeCanvas
  };
}
