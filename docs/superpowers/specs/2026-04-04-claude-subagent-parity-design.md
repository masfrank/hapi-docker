# Claude Subagent Parity With Codex UX

## Goal

Bring Claude subagent behavior in HAPI up to near-Codex UX parity without forcing Claude to imitate Codex's raw protocol. The product goal is a unified user experience for:

- nested subagent chat visibility
- parent/child lineage
- child transcript replay on resume/import
- subagent title and lifecycle status
- team/task extraction and visualization

The technical goal is to preserve each agent's native interfaces while normalizing them into one HAPI semantic layer that hub and web can consume consistently.

## Non-Goals

This work does not:

- replace Claude native `Task` semantics with Codex `spawn_agent` semantics
- redesign the entire chat UI
- invent a new team/task product model beyond the current `TeamState`
- remove Codex-specific capabilities that already work

## Current State

### Codex

Codex already has a mature HAPI adaptation layer:

- sidechain metadata is normalized from raw event data
- spawn/wait/send/close subagent tools are converted into stable HAPI-visible tool calls
- child transcript linking exists in the Codex scanner
- explicit remote resume can replay prior transcript state
- web has Codex-oriented sidechain annotation and a Codex-specific subagent preview card

This gives Codex a coherent nested-subagent experience across CLI, hub, and web.

### Claude

Claude already has partial building blocks:

- `Task` tool is recognized and rendered
- Claude SDK messages with `parent_tool_use_id` can be mapped into sidechain messages
- remote resume replay now exists for explicit import/resume flows
- hub team/task extraction can already read Claude assistant `tool_use` blocks in some cases

But the overall behavior is still weaker than Codex:

- lineage is not normalized into a stable cross-layer subagent model
- child transcript linking is not first-class
- lifecycle/title extraction is shallow
- web subagent rendering is Codex-specific
- team/task state derived from Claude remains opportunistic rather than intentional

## Design Principles

1. Preserve native agent semantics.
Claude stays Claude. Codex stays Codex.

2. Normalize at the HAPI semantic layer.
Hub and web should consume agent-neutral subagent concepts rather than raw Claude/Codex event shapes.

3. Keep product UX aligned.
Users should see similar concepts and interaction quality across Codex and Claude even if implementation differs underneath.

4. Improve Claude without regressing Codex.
Codex remains the stronger implementation baseline and should be used as the reference UX.

## Proposed Architecture

Introduce a unified internal subagent semantic layer with two adapters:

- Codex subagent adapter
- Claude subagent adapter

Each adapter maps agent-native events and transcript structures into the same semantic outputs.

### Unified Subagent Semantics

The normalized layer should support these concepts:

- `subagent_spawn`
- `subagent_prompt`
- `subagent_message`
- `subagent_status`
- `subagent_title`
- `subagent_lineage`
- `team_delta`

These are internal HAPI semantics, not new user-facing protocol names that external tools must emit directly.

### Layer Responsibilities

#### CLI

Responsible for deriving normalized subagent semantics from native agent streams and transcript files.

#### Hub

Responsible for storing/merging session state and deriving stable `TeamState` updates from normalized semantics.

#### Web

Responsible for rendering nested conversation, lifecycle preview, and team/task visualization from normalized data, without Codex-only assumptions.

## Claude CLI Design

Claude needs four concrete upgrades.

### 1. Stable Sidechain Identity

Current Claude flow relies mainly on `parent_tool_use_id` and transient SDK conversion state. That is enough for simple nested display, but not enough for durable lineage across replay and cross-layer rendering.

Claude adapter should derive a stable `sidechainKey` from the parent `Task` tool use identity and preserve it through:

- live SDK conversion
- replay conversion
- interrupted tool result synthesis
- web normalization

The result should be equivalent in product behavior to Codex's `parentToolCallId` usage.

### 2. Child Transcript Linking

Claude should gain an explicit child transcript linking path similar in effect to Codex, but driven by Claude-native evidence.

The adapter should:

- detect when a `Task` launch corresponds to a child conversation
- discover child transcript files using Claude-native session/transcript metadata
- attach child transcript events back to the parent subagent chain
- preserve enough lineage metadata for replay and UI grouping

Linking must be conservative. If a child transcript cannot be linked confidently, HAPI should prefer incomplete linkage over incorrect lineage.

### 3. Lifecycle Extraction

Claude adapter should derive lifecycle snapshots for each subagent:

- waiting
- running
- completed
- error
- closed

Lifecycle should come from a combination of:

- `Task` tool use/result pairs
- Claude SDK/system/result events
- transcript evidence when replaying/resuming

This lifecycle model should match the existing Codex preview card capabilities as closely as possible.

### 4. Title Extraction

Claude subagents should have a stable display title with fallback order:

1. explicit subagent/tool-provided title if available
2. prompt-derived title
3. short session identifier

This title is for UI clarity and lineage display, not for mutating Claude's own underlying protocol.

## Codex CLI Design

Codex should not be reworked functionally. Instead, current Codex behavior should be reorganized behind the same semantic interface used by Claude.

Expected Codex changes are limited to:

- extracting current subagent/lifecycle logic into the shared semantic boundary
- leaving existing scanner/replay/preview behavior intact
- ensuring Codex and Claude emit comparable semantic outputs

## Hub Design

### Team/Task Extraction

Current `hub/src/sync/teams.ts` already acts like a cross-agent extraction layer, but it is still partly shaped around raw tool names and partial per-agent assumptions.

This should become an intentional semantic ingestion layer:

- CLI-originated normalized subagent/team/task semantics are the primary input
- raw tool-block fallback remains allowed for backward compatibility inside the repo, but should be secondary
- `Task` in Claude and `CodexSpawnAgent`-family semantics in Codex should converge into the same `TeamState` mutation model

### TeamState Semantics

The current `TeamState` model remains the product surface:

- `members`
- `tasks`
- `messages`
- `updatedAt`

But extraction becomes more reliable:

- spawned subagent becomes a `member`
- subagent work prompt/description becomes a `task`
- lifecycle transitions update task/member state
- cross-agent coordination messages continue to appear in `messages`

### Merge/Replay Safety

Session import/refresh/resume must preserve normalized subagent state consistently.

Rules:

- replay should not duplicate already-materialized subagent events
- merge should preserve team/task state integrity
- import/refresh failure cleanup should not leave partial lineage/team state artifacts

## Web Design

### 1. Agent-Neutral Sidechain Model

Current web chat logic still has clear Codex-specific behavior, especially in:

- `web/src/chat/codexSidechain.ts`
- `web/src/components/AssistantChat/messages/CodexSubagentPreviewCard.tsx`
- `ToolMessage.tsx` render-mode branching

These should be refactored into agent-neutral subagent rendering primitives.

Planned shape:

- generic sidechain/subagent annotation module
- generic subagent preview card
- agent-specific formatting only where presentation genuinely differs

### 2. Nested Transcript Rendering

Both Codex and Claude should render nested child work with the same product behavior:

- root tool call remains visible
- nested child conversation is grouped under that tool call
- task prompt can be summarized while full transcript remains inspectable
- lifecycle badges and recent status remain visible

### 3. TeamPanel Reliability

`TeamPanel` should not need major redesign. The improvement should come from stronger data quality.

Expected result:

- Claude sessions with subagent activity reliably populate `TeamPanel`
- task/member state feels comparable to Codex sessions
- no special-case Claude panel is introduced

## Data Flow

### Live Flow

1. Agent emits native SDK/app-server/tool/transcript signals
2. Agent adapter converts them to normalized subagent semantics
3. CLI emits HAPI-visible messages/state updates
4. Hub updates session/team state
5. Web normalizes and renders nested subagent and team/task views

### Replay/Resume Flow

1. Resume/import identifies prior session/transcript
2. Agent adapter replays transcript through the same semantic conversion layer
3. Duplicate-safe normalization prevents repeated or mis-grouped child events
4. Hub/web consume replayed semantics the same way as live flow

## Error Handling

### Claude Lineage Ambiguity

If Claude child lineage cannot be linked confidently:

- do not fabricate parent/child linkage
- keep content visible as root-level or minimally grouped content
- avoid wrong grouping over aggressive grouping

### Partial Lifecycle Evidence

If lifecycle cannot be fully inferred:

- preserve last known status
- prefer `running` or `completed` only when evidence is clear
- never mark a subagent `completed` from weak heuristics alone

### Replay Duplication

Replay and live streams must share a clear deduplication boundary:

- dedupe by stable event/message identity where available
- otherwise dedupe by normalized semantic key plus transcript position
- avoid masking real repeated child outputs that are semantically distinct

## Testing Strategy

### CLI

- Claude adapter unit tests for spawn/prompt/status/title extraction
- Claude child transcript linking tests
- Claude replay tests covering nested sidechains
- Codex parity regression tests to ensure no behavior loss

### Hub

- normalized team/task extraction tests for Claude and Codex
- replay/import/refresh merge integrity tests
- regression tests for `TeamState` updates from both agents

### Web

- sidechain annotation tests for Claude and Codex
- generic subagent preview card tests
- reducer/timeline tests for mixed nested transcripts
- `TeamPanel` rendering tests for Claude-derived state

## Migration Strategy

Implement in stages:

1. define shared internal subagent semantic contracts
2. move Codex logic behind those contracts without changing behavior
3. upgrade Claude adapter to emit the same semantics
4. generalize web subagent rendering from Codex-only to agent-neutral
5. strengthen hub team/task extraction to prefer normalized semantics

This ordering minimizes risk because Codex remains the reference implementation while Claude catches up.

## Success Criteria

This work is successful when:

- Claude nested subagent conversations are visible and grouped as reliably as Codex
- Claude replay/import/resume preserves child conversation context without obvious duplication
- Claude subagents show useful title and lifecycle state
- Claude sessions populate `TeamPanel` with meaningful member/task state
- web no longer depends on Codex-specific preview/rendering for subagent UX
- Codex behavior does not regress

## Open Tradeoff Decisions Resolved

### Why not make Claude emit fake Codex events?

Because that would optimize for short-term implementation convenience while increasing long-term drift risk. HAPI should normalize semantics, not erase protocol differences.

### Why keep TeamState instead of inventing a new model?

Because current product needs are already served by `TeamState`, and the real issue is extraction quality, not missing schema surface.

### Why keep Codex as the UX reference?

Because Codex is already the stronger implementation in this area, and users explicitly want Claude to feel as good as that path.
