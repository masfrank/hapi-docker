# Task: Add cursor-cli support to HAPI

**Task link**: https://github.com/tiann/hapi/issues/207
**Status**: open
**Project**: tiann/hapi

## Problem description

cursor-cli usage is similar to claude code, gemini, codex. HAPI would be great if it could support cursor-cli.

**From issue bot comment:**
- Current code only defines `claude/codex/gemini/opencode` agent flavors
- CLI subcommands: `codex/gemini/opencode` (default `claude`)
- No cursor-cli adapter at this stage

**Cursor CLI reference:**
- `agent` command (or `cursor agent`) - interactive session
- `agent -p "prompt"` - print/non-interactive mode
- `agent --resume [chatId]`, `agent --continue` - session resume
- `agent --mode plan|ask` - plan/ask modes
- `agent --model <model>` - model selection
- `agent --yolo` / `--force` - bypass approvals
- Install: `curl https://cursor.com/install -fsS | bash` (macOS/Linux), `irm 'https://cursor.com/install?win32=true' | iex` (Windows)

## Todo

- [x] Analyze root cause
- [x] Locate relevant code files
- [x] Plan fix
- [x] Implement fix
- [x] Run checks (typecheck passes; 10 pre-existing test failures in path.test/sessionScanner)
- [ ] Commit

## Related files

- `shared/src/modes.ts:27` - Agent flavor list (add `cursor`)
- `cli/src/commands/registry.ts` - CLI subcommand registration (add `cursor` command)
- `cli/src/commands/codex.ts` - Reference for cursor command structure
- `cli/src/codex/` - Codex runner (loop, session, local launcher) - pattern to follow for cursor
- `web/src/lib/agentFlavorUtils.ts` - `isKnownFlavor`, `isCodexFamilyFlavor` (add cursor handling)
- `shared/src/schemas.ts` - Session metadata (add `cursorSessionId` if needed)

## Approach

1. Add `cursor` to `AgentFlavor` in `shared/src/modes.ts`
2. Define Cursor permission modes (cursor uses plan/ask/yolo similar to codex)
3. Add `cursorCommand` in `cli/src/commands/cursor.ts` (spawn `agent` CLI)
4. Register `cursor` in `cli/src/commands/registry.ts`
5. Create `cli/src/cursor/` mirroring codex structure:
   - `runCursor.ts` - bootstrap session with flavor `cursor`, run loop
   - `loop.ts` - local/remote session loop
   - `session.ts` - CursorSession extending AgentSessionBase
   - `cursorLocal.ts` - spawn `agent` with args (resume, model, mode, etc.)
   - `cursorLocalLauncher.ts`, `cursorRemoteLauncher.ts`
6. Update `agentFlavorUtils.ts` - add cursor to known flavors
7. Update claude help text in `cli/src/commands/claude.ts` to mention `hapi cursor`
8. Check hub/web for flavor-specific UI (permission modes, etc.)

## Open questions (from bot)

- Cursor-cli version/install method? → Use `agent` command (Cursor CLI)
- How should HAPI start it? → Local launch (like codex), optionally remote
- Official protocol/log format? → TBD - may need to inspect agent output or use similar approach to codex session scanner
- Minimal repro command? → `agent` or `agent "prompt"`
