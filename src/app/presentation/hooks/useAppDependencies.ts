import { useMemo } from "preact/hooks";
import type { LayoutConfig, Viewport } from "../../domain/layout/types";
import type { AppDependencies } from "../../application/usecases/types";
import { dialog } from "../../infrastructure/tauri/dialogApi";
import { appWindow } from "../../infrastructure/tauri/windowApi";
import * as mapFileApi from "../../infrastructure/tauri/mapFileApi";

export function useAppDependencies(
  getLayoutConfig: () => LayoutConfig,
  getViewportSize: () => Viewport
): AppDependencies {
  const buildId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `tab-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
  };

  return useMemo(() => ({
    id: { nextId: buildId },
    layout: { getLayoutConfig, getViewport: getViewportSize },
    mapFile: mapFileApi,
    dialog,
    window: {
      setTitle: (title: string) => appWindow.setTitle(title),
      close: () => appWindow.close(),
      destroy: () => appWindow.destroy()
    }
  }), [getLayoutConfig, getViewportSize]);
}
