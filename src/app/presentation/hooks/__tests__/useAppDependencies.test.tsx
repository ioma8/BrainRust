/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "./hookTestUtils";
import { useAppDependencies } from "../useAppDependencies";
import { appWindow } from "../../../infrastructure/tauri/windowApi";

vi.mock("../../../infrastructure/tauri/windowApi", () => ({
  appWindow: {
    setTitle: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn()
  }
}));

vi.mock("../../../infrastructure/tauri/dialogApi", () => ({
  dialog: {
    ask: vi.fn(),
    open: vi.fn(),
    save: vi.fn(),
    confirm: vi.fn()
  }
}));

vi.mock("../../../infrastructure/tauri/mapFileApi", () => ({
  loadMap: vi.fn(),
  saveMap: vi.fn()
}));

describe("useAppDependencies", () => {
  it("bridges window actions and layout providers", async () => {
    const getLayoutConfig = () => ({
      nodeHeight: 20,
      hGap: 10,
      vGap: 10,
      minNodeWidth: 80,
      measureNodeWidth: () => 120
    });
    const getViewport = () => ({ width: 800, height: 600 });
    const { result } = renderHook(() => useAppDependencies(getLayoutConfig, getViewport));

    await result.window.setTitle("Hello");

    const layout = result.layout.getLayoutConfig();
    expect(appWindow.setTitle).toHaveBeenCalledWith("Hello");
    expect(layout.nodeHeight).toBe(20);
    expect(layout.hGap).toBe(10);
    expect(layout.vGap).toBe(10);
    expect(layout.minNodeWidth).toBe(80);
    expect(layout.measureNodeWidth()).toBe(120);
    expect(result.layout.getViewport()).toEqual(getViewport());
  });
});
