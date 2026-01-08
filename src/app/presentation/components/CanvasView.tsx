import type { Ref } from "preact";

type CanvasViewProps = {
  canvasRef: Ref<HTMLCanvasElement>;
  onMouseDown: (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onDoubleClick: (event: MouseEvent) => void;
};

export function CanvasView({
  canvasRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onDoubleClick
}: CanvasViewProps) {
  return (
    <div className="relative flex flex-1">
      <canvas
        ref={canvasRef}
        className="h-full w-full bg-[var(--canvas-bg)]"
        tabIndex={0}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDblClick={onDoubleClick}
      />
    </div>
  );
}
