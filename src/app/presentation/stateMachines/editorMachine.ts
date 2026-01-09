import type { EditorStyle } from "../components/NodeEditor";

export type EditorState =
  | { status: "closed"; style: null }
  | { status: "editing"; style: EditorStyle };

export type EditorEvent =
  | { type: "open"; style: EditorStyle }
  | { type: "close" };

export function editorReducer(state: EditorState, event: EditorEvent): EditorState {
  if (event.type === "open") {
    return { status: "editing", style: event.style };
  }
  if (event.type === "close") {
    return { status: "closed", style: null };
  }
  return state;
}
