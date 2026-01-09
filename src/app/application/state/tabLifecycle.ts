export type TabLifecycleState = {
  status: "idle" | "creating" | "closing";
};

export type TabLifecycleEvent =
  | { type: "start_create" }
  | { type: "start_close" }
  | { type: "finish" };

export function tabLifecycleReducer(
  state: TabLifecycleState,
  event: TabLifecycleEvent
): TabLifecycleState {
  if (event.type === "start_create" && state.status === "idle") {
    return { status: "creating" };
  }
  if (event.type === "start_close" && state.status === "idle") {
    return { status: "closing" };
  }
  if (event.type === "finish") {
    return { status: "idle" };
  }
  return state;
}
