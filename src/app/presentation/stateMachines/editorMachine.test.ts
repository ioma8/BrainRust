import { expect, test } from "vitest";
import { editorReducer, type EditorState } from "./editorMachine";

test("editor state transitions", () => {
  const closed: EditorState = { status: "closed", style: null };
  const opened = editorReducer(closed, {
    type: "open",
    style: { left: 10, top: 20, width: 100, height: 30 }
  });
  expect(opened.status).toBe("editing");
  if (opened.status === "editing") {
    expect(opened.style.left).toBe(10);
  }
  const closedAgain = editorReducer(opened, { type: "close" });
  expect(closedAgain.status).toBe("closed");
});
