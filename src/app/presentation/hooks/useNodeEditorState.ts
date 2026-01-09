import { useCallback, useReducer, useRef } from "preact/hooks";
import type { MindMap } from "../../types";
import type { EditorStyle } from "../components/NodeEditor";
import { NODE_HEIGHT } from "../../domain/values/layout";
import { editorReducer } from "../stateMachines/editorMachine";

export function useNodeEditorState(
  canvasRef: { current: HTMLCanvasElement | null },
  getNodeWidth: (node: MindMap["nodes"][string]) => number
) {
  const [editorState, dispatch] = useReducer(editorReducer, { status: "closed", style: null });
  const editorRef = useRef<HTMLInputElement | null>(null);
  const isEditingRef = useRef(false);

  const isEditing = editorState.status === "editing";
  const editorStyle: EditorStyle | null = editorState.status === "editing" ? editorState.style : null;

  const focusEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    requestAnimationFrame(() => {
      editor.focus();
      editor.select();
    });
  }, []);

  const resolveEditorStyle = useCallback(
    (
      node: MindMap["nodes"][string],
      offset: { x: number; y: number },
      position?: { left: number; top: number; width: number; height: number }
    ): EditorStyle | null => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const nodeW = getNodeWidth(node);
      const nodeH = NODE_HEIGHT;
      return {
        left: position?.left ?? rect.left + node.x + offset.x,
        top: position?.top ?? rect.top + node.y + offset.y,
        width: position?.width ?? nodeW,
        height: position?.height ?? nodeH
      };
    },
    [canvasRef, getNodeWidth]
  );

  const openEditor = useCallback(
    (
      map: MindMap,
      offset: { x: number; y: number },
      nodeId: string,
      position?: { left: number; top: number; width: number; height: number; content?: string }
    ) => {
      const node = map.nodes[nodeId];
      if (!node) return;
      const style = resolveEditorStyle(node, offset, position);
      if (!style) return;
      const editor = editorRef.current;
      if (editor) {
        editor.value = position?.content ?? node.content;
      }
      isEditingRef.current = true;
      dispatch({ type: "open", style });
      focusEditor();
    },
    [focusEditor, resolveEditorStyle]
  );

  const closeEditor = useCallback(() => {
    isEditingRef.current = false;
    dispatch({ type: "close" });
    const editor = editorRef.current;
    if (editor) editor.value = "";
    canvasRef.current?.focus();
  }, [canvasRef]);

  return {
    isEditing,
    editorStyle,
    editorRef,
    isEditingRef,
    openEditor,
    closeEditor
  };
}
