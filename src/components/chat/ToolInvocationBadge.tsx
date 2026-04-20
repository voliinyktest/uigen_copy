import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

export function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : null;
  const command = typeof args.command === "string" ? args.command : null;

  if (toolName === "str_replace_editor" && path && command) {
    if (command === "create") return `Creating ${path}`;
    if (command === "str_replace" || command === "insert") return `Editing ${path}`;
    if (command === "view") return `Reading ${path}`;
    if (command === "undo_edit") return `Undoing edit in ${path}`;
  }

  if (toolName === "file_manager" && path && command) {
    const newPath = typeof args.new_path === "string" ? args.new_path : null;
    if (command === "rename") return newPath ? `Renaming ${path} → ${newPath}` : `Renaming ${path}`;
    if (command === "delete") return `Deleting ${path}`;
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const label = getToolLabel(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, unknown>
  );
  const done = toolInvocation.state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

