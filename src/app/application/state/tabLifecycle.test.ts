import { expect, test } from "vitest";
import { tabLifecycleReducer, type TabLifecycleState } from "./tabLifecycle";

test("tab lifecycle transitions", () => {
  const idle: TabLifecycleState = { status: "idle" };
  const creating = tabLifecycleReducer(idle, { type: "start_create" });
  expect(creating.status).toBe("creating");

  const closing = tabLifecycleReducer(idle, { type: "start_close" });
  expect(closing.status).toBe("closing");

  const finished = tabLifecycleReducer(creating, { type: "finish" });
  expect(finished.status).toBe("idle");
});
