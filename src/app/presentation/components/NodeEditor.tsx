import type { Ref } from "preact";

export type EditorStyle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type NodeEditorProps = {
  editorRef: Ref<HTMLInputElement>;
  isEditing: boolean;
  style: EditorStyle | null;
  onBlur: () => void;
};

export function NodeEditor({ editorRef, isEditing, style, onBlur }: NodeEditorProps) {
  return (
    <input
      ref={editorRef}
      type="text"
      id="node-editor"
      className={[
        "fixed z-30 rounded-[6px] border-2 bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--text-color)] outline-none shadow-[0_12px_30px_rgba(15,23,42,0.16)]",
        "border-[var(--editor-border)]",
        isEditing ? "block" : "hidden"
      ].join(" ")}
      style={style ? {
        left: `${style.left}px`,
        top: `${style.top}px`,
        width: `${style.width}px`,
        height: `${style.height}px`
      } : undefined}
      onBlur={onBlur}
    />
  );
}
