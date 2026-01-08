import type { LayoutConfig, Viewport } from "../../domain/layout/types";

export type LayoutPort = {
  getLayoutConfig: () => LayoutConfig;
  getViewport: () => Viewport;
};
