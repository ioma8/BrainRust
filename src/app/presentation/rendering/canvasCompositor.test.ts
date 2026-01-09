import { expect, test, vi } from "vitest";
import { drawBackgroundImage } from "./canvasCompositor";

test("drawBackgroundImage draws with identity transform and restores state", () => {
  const calls: string[] = [];
  const ctx = {
    save: vi.fn(() => calls.push("save")),
    restore: vi.fn(() => calls.push("restore")),
    setTransform: vi.fn(() => calls.push("setTransform")),
    drawImage: vi.fn(() => calls.push("drawImage"))
  };

  drawBackgroundImage(ctx, {} as HTMLCanvasElement);

  expect(calls).toEqual(["save", "setTransform", "drawImage", "restore"]);
  expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
});
