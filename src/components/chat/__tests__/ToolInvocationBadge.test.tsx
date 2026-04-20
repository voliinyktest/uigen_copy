import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "1", toolName, args, state, result: "ok" };
  }
  return { toolCallId: "1", toolName, args, state };
}

// getToolLabel unit tests

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/Button.tsx" })).toBe("Editing /Button.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing /App.jsx");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading /App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in /App.jsx");
});

test("getToolLabel: file_manager rename with destination", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/OldName.jsx", new_path: "/NewName.jsx" })).toBe("Renaming /OldName.jsx → /NewName.jsx");
});

test("getToolLabel: file_manager rename without destination (partial-call)", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/OldName.jsx" })).toBe("Renaming /OldName.jsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
});

test("getToolLabel: unknown tool falls back to tool name", () => {
  expect(getToolLabel("some_unknown_tool", {})).toBe("some_unknown_tool");
});

test("getToolLabel: missing command falls back to tool name", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("str_replace_editor");
});

// ToolInvocationBadge rendering tests

test("renders label for str_replace_editor create", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("renders label for file_manager delete", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/App.jsx" })} />);
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("renders rename label with destination path", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/OldName.jsx", new_path: "/NewName.jsx" })} />);
  expect(screen.getByText("Renaming /OldName.jsx → /NewName.jsx")).toBeDefined();
});

test("renders spinner during partial-call state", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: {},
    state: "partial-call",
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("falls back to tool name during partial-call with no args yet", () => {
  const invocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: {},
    state: "partial-call",
  };
  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

test("renders green dot when state is result", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result")} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("renders spinner when state is call (in-progress)", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("falls back to tool name for unknown tool", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("some_tool", {})} />);
  expect(screen.getByText("some_tool")).toBeDefined();
});
