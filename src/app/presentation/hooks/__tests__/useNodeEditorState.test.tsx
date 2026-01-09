/**
 * @vitest-environment jsdom
 */
import { act } from "preact/test-utils";
import { describe, expect, it } from "vitest";
import { renderHook } from "./hookTestUtils";
import { useNodeEditorState } from "../useNodeEditorState";

describe("useNodeEditorState", () => {
  it("opens and closes the editor with node content", async () => {
    const canvas = document.createElement("canvas");
    canvas.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 200, height: 100 } as DOMRect);
    const hook = renderHook(() => useNodeEditorState({ current: canvas }, () => 120));
    const input = document.createElement("input");
    hook.result.editorRef.current = input;
    const map = {
      root_id: "root",
      selected_node_id: "root",
      nodes: {
        root: {
          id: "root",
          content: "Hello",
          children: [],
          parent: null,
          x: 5,
          y: 6,
          icons: [],
          created: 0,
          modified: 0
        }
      }
    };

    await act(async () => {
      hook.result.openEditor(map, { x: 0, y: 0 }, "root");
    });

    expect(hook.result.isEditing).toBe(true);
    expect(hook.result.isEditingRef.current).toBe(true);
    expect(hook.result.editorStyle?.left).toBe(15);
    expect(input.value).toBe("Hello");

    await act(async () => {
      hook.result.closeEditor();
    });

    expect(hook.result.isEditing).toBe(false);
    expect(hook.result.isEditingRef.current).toBe(false);
    expect(hook.result.editorStyle).toBeNull();
  });
});
