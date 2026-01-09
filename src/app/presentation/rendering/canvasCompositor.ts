export type CanvasCompositorContext = {
  save: () => void;
  restore: () => void;
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  drawImage: (image: CanvasImageSource, dx: number, dy: number) => void;
};

export function drawBackgroundImage(ctx: CanvasCompositorContext, canvas: HTMLCanvasElement) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}

