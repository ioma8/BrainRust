import { render } from "@testing-library/preact";
import { act } from "preact/test-utils";
import type { ComponentChildren } from "preact";

export function renderHook<T>(hook: () => T) {
  let latest: T | null = null;
  function Wrapper({ children }: { children?: ComponentChildren }) {
    latest = hook();
    return children ?? null;
  }
  render(<Wrapper />);
  if (!latest) {
    throw new Error("Hook did not render.");
  }
  return {
    get result() {
      return latest as T;
    }
  };
}

export async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
