# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps + Prisma generate + DB migrate
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run all tests with Vitest
npm run db:reset     # Reset database (destructive)
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=   # Optional — omit to use MockLanguageModel (static demo components)
JWT_SECRET=          # Optional — falls back to a hardcoded dev key if unset
```

## Architecture

UIGen is a Next.js 15 app that lets users describe React components in a chat interface, then generates and renders them live in an iframe.

### Request Flow

1. User message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Vercel AI SDK `streamText()` calls Claude with two tools (defined in `src/lib/tools/`):
   - `str_replace_editor` — create/view/edit files in the virtual FS
   - `file_manager` — rename/delete files
3. Tool calls are executed client-side via `ChatContext` + `FileSystemContext`
4. `PreviewFrame` renders the virtual FS files in an iframe using Babel for JSX transformation

The system prompt uses Anthropic's ephemeral prompt caching — keep it in mind when modifying `src/lib/prompts/generation.tsx`, as the cache is keyed to the exact prompt text.

### Virtual File System

`src/lib/file-system.ts` — in-memory, no disk I/O. Serialized to JSON for API requests and persisted in the `Project.data` DB column. The file system context (`src/lib/contexts/file-system-context.tsx`) holds current state and triggers re-renders when files change.

### Preview Rendering

`src/lib/transform/jsx-transformer.ts` transforms JSX to JS using Babel Standalone (browser-side, no build step). `PreviewFrame` auto-detects the entry point by looking for `/App.jsx`, `/App.tsx`, `/index.jsx`, etc. Third-party package imports in generated components are resolved to `esm.sh` CDN URLs via an import map; local files are served as blob URLs. The `@/` alias resolves to the virtual FS root.

### Layout

`src/app/main-content.tsx` — resizable split: chat panel (left) + preview/code editor tabs (right). The code editor uses Monaco; the preview uses an iframe whose content is rebuilt by `src/lib/transform/jsx-transformer.ts` whenever files change.

### Language Model Provider

`src/lib/provider.ts` — returns a real Anthropic model (`claude-haiku-4-5`) when `ANTHROPIC_API_KEY` is set, otherwise falls back to `MockLanguageModel` which returns static components. System prompt is in `src/lib/prompts/generation.tsx`.

### Auth

JWT stored in an HttpOnly cookie. `src/lib/auth.ts` handles session create/get/delete. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes. Projects can be owned by a user or anonymous (no `userId`).

### Database

Prisma + SQLite. Two models: `User` and `Project`. `Project.messages` stores chat history (JSON); `Project.data` stores the serialized virtual file system (JSON). Prisma client is generated to `src/generated/prisma`.

### Testing

Tests live alongside source in `__tests__` directories. Uses Vitest + React Testing Library + jsdom. Mock providers/contexts are used instead of real Anthropic calls.
