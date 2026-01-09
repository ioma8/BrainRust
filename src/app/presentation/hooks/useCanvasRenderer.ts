import { useCallback, useMemo, useRef } from "preact/hooks";
import type { MindMap, Node } from "../../../types";
import { getNodeAt as hitTestNode } from "../../domain/layout/geometry";
import type { LayoutConfig, Point, Viewport } from "../../domain/layout/types";
import { H_GAP, MIN_NODE_WIDTH, NODE_HEIGHT, V_GAP } from "../../domain/values/layout";
import type { ThemeColors } from "../theme/theme";
import { iconMap } from "../constants/icons";
import { EMOJI_FONT, NODE_FONT } from "../constants/typography";
import { buildRenderPlan, type RenderEdge, type RenderNode } from "../rendering/renderPlan";
import { drawBackgroundImage } from "../rendering/canvasCompositor";
import { buildSelectedNodeOverlay } from "../rendering/selectionOverlay";
const ICON_SPACING = 20;
const TEXT_PADDING = 20;

export function useCanvasRenderer(themeColorsRef: { current: ThemeColors }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const viewportRef = useRef({ width: 0, height: 0 });
  const backgroundRef = useRef<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null>(null);
  const backgroundCacheRef = useRef<{
    nodesRef: MindMap["nodes"];
    offset: Point;
    width: number;
    height: number;
    dpr: number;
    themeKey: string;
  } | null>(null);

  const measureNodeWidth = useCallback((node: Node): number => {
    const ctx = ctxRef.current;
    if (!ctx) return MIN_NODE_WIDTH;
    ctx.font = NODE_FONT;
    const textW = ctx.measureText(node.content).width;
    const iconsW = node.icons.length * ICON_SPACING;
    return textW + iconsW + TEXT_PADDING;
  }, []);

  const getLayoutConfig = useCallback((): LayoutConfig => ({
    nodeHeight: NODE_HEIGHT,
    hGap: H_GAP,
    vGap: V_GAP,
    minNodeWidth: MIN_NODE_WIDTH,
    measureNodeWidth
  }), [measureNodeWidth]);

  const getNodeWidth = useCallback(
    (node: Node): number => Math.max(measureNodeWidth(node), MIN_NODE_WIDTH),
    [measureNodeWidth]
  );

  const getViewportSize = useCallback((): Viewport => {
    const { width, height } = viewportRef.current;
    if (width > 0 && height > 0) return { width, height };
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const resizeCanvas = useCallback(() => {
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
  }, []);

  const ensureBackgroundCanvas = useCallback((width: number, height: number) => {
    const dpr = window.devicePixelRatio || 1;
    let background = backgroundRef.current;
    if (!background) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      background = { canvas, ctx };
      backgroundRef.current = background;
    }
    const { canvas, ctx } = background;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return background;
  }, []);

  const roundRect = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) => {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }, []);

  const applyNodeShadow = useCallback((ctx: CanvasRenderingContext2D, isSelected: boolean, colors: ThemeColors) => {
    if (isSelected) {
      ctx.shadowColor = colors.nodeSelectedGlow;
      ctx.shadowBlur = 10;
      return;
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }, []);

  const drawNodeShape = useCallback((
    ctx: CanvasRenderingContext2D,
    node: RenderNode,
    colors: ThemeColors
  ) => {
    ctx.fillStyle = node.isSelected ? colors.nodeSelected : colors.node;
    applyNodeShadow(ctx, node.isSelected, colors);
    roundRect(ctx, node.x, node.y, node.width, node.height, 5);
    ctx.fill();
    ctx.strokeStyle = node.isSelected ? colors.nodeBorderSelected : colors.nodeBorder;
    ctx.lineWidth = node.isSelected ? 2 : 1;
    ctx.stroke();
  }, [applyNodeShadow, roundRect]);

  const drawNodeText = useCallback((
    ctx: CanvasRenderingContext2D,
    node: RenderNode,
    colors: ThemeColors
  ) => {
    ctx.fillStyle = node.isSelected ? colors.textSelected : colors.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let currentX = node.x + 10;
    node.icons.forEach((iconName) => {
      const emoji = iconMap[iconName] || "?";
      ctx.font = EMOJI_FONT;
      ctx.fillText(emoji, currentX, node.y + node.height / 2 + 1);
      currentX += ICON_SPACING;
    });
    ctx.font = NODE_FONT;
    ctx.fillText(node.content, currentX, node.y + node.height / 2);
  }, []);
  const drawEdges = useCallback((edges: RenderEdge[], colors: ThemeColors, ctx?: CanvasRenderingContext2D) => {
    const target = ctx ?? ctxRef.current;
    if (!target) return;
    target.strokeStyle = colors.edge;
    target.lineWidth = 2;
    target.lineCap = "round";
    target.lineJoin = "round";
    edges.forEach((edge) => {
      target.beginPath();
      target.moveTo(edge.start.x, edge.start.y);
      target.bezierCurveTo(edge.cp1.x, edge.cp1.y, edge.cp2.x, edge.cp2.y, edge.end.x, edge.end.y);
      target.stroke();
    });
  }, []);

  const drawNodes = useCallback((nodes: RenderNode[], colors: ThemeColors, ctx?: CanvasRenderingContext2D) => {
    const target = ctx ?? ctxRef.current;
    if (!target) return;
    nodes.forEach((node) => {
      drawNodeShape(target, node, colors);
      drawNodeText(target, node, colors);
    });
  }, [drawNodeShape, drawNodeText]);

  const shouldRebuildBackground = useCallback((
    map: MindMap,
    offset: Point,
    width: number,
    height: number,
    dpr: number,
    themeKey: string
  ) => {
    const cache = backgroundCacheRef.current;
    if (!cache) return true;
    return (
      cache.nodesRef !== map.nodes ||
      cache.offset.x !== offset.x ||
      cache.offset.y !== offset.y ||
      cache.width !== width ||
      cache.height !== height ||
      cache.dpr !== dpr ||
      cache.themeKey !== themeKey
    );
  }, []);

  const renderCanvas = useCallback((map: MindMap, offset: Point) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    let { width, height } = viewportRef.current;
    if (width <= 0 || height <= 0) {
      resizeCanvas();
      ({ width, height } = viewportRef.current);
      if (width <= 0 || height <= 0) return;
    }
    const colors = themeColorsRef.current;
    const dpr = window.devicePixelRatio || 1;
    const themeKey = [
      colors.canvasBg,
      colors.edge,
      colors.node,
      colors.nodeSelected,
      colors.nodeBorder,
      colors.nodeBorderSelected,
      colors.nodeSelectedGlow,
      colors.text,
      colors.textSelected
    ].join("|");
    const background = ensureBackgroundCanvas(width, height);
    if (!background) return;

    if (shouldRebuildBackground(map, offset, width, height, dpr, themeKey)) {
      const backgroundPlan = buildRenderPlan(
        map,
        offset,
        { nodeHeight: NODE_HEIGHT, getNodeWidth },
        null
      );
      background.ctx.fillStyle = colors.canvasBg;
      background.ctx.fillRect(0, 0, width, height);
      drawEdges(backgroundPlan.edges, colors, background.ctx);
      drawNodes(backgroundPlan.nodes, colors, background.ctx);
      backgroundCacheRef.current = {
        nodesRef: map.nodes,
        offset: { ...offset },
        width,
        height,
        dpr,
        themeKey
      };
    }

    drawBackgroundImage(ctx, background.canvas);
    const selected = buildSelectedNodeOverlay(map, offset, { nodeHeight: NODE_HEIGHT, getNodeWidth });
    if (selected) {
      drawNodes([selected], colors);
    }
  }, [
    drawEdges,
    drawNodes,
    ensureBackgroundCanvas,
    getNodeWidth,
    resizeCanvas,
    shouldRebuildBackground,
    themeColorsRef
  ]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top, rect };
  }, []);

  const getNodeAt = useCallback((map: MindMap, offset: Point, clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return null;
    return hitTestNode(map, offset, { x: point.x, y: point.y }, getLayoutConfig());
  }, [getCanvasPoint, getLayoutConfig]);

  return useMemo(() => ({
    canvasRef,
    getLayoutConfig,
    getNodeWidth,
    getViewportSize,
    getCanvasPoint,
    getNodeAt,
    renderCanvas,
    resizeCanvas
  }), [
    canvasRef,
    getLayoutConfig,
    getNodeWidth,
    getViewportSize,
    getCanvasPoint,
    getNodeAt,
    renderCanvas,
    resizeCanvas
  ]);
}
