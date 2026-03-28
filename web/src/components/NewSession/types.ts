import { getLevelOptionLabel, PI_THINKING_LEVELS } from '@hapi/protocol'
import type { PiThinkingLevel } from '@hapi/protocol/types'

export type { PiThinkingLevel }

export type AgentType = 'claude' | 'codex' | 'cursor' | 'gemini' | 'opencode' | 'pi'
export type SessionType = 'simple' | 'worktree'
export type CodexReasoningEffort = 'default' | 'low' | 'medium' | 'high' | 'xhigh'
export type ClaudeEffort = 'auto' | 'medium' | 'high' | 'max'

export const MODEL_OPTIONS: Record<AgentType, { value: string; label: string }[]> = {
    claude: [
        { value: 'auto', label: 'Auto' },
        { value: 'opus', label: 'Opus' },
        { value: 'opus[1m]', label: 'Opus 1M' },
        { value: 'sonnet', label: 'Sonnet' },
        { value: 'sonnet[1m]', label: 'Sonnet 1M' },
    ],
    codex: [
        { value: 'auto', label: 'Auto' },
        { value: 'gpt-5.4', label: 'GPT-5.4' },
        { value: 'gpt-5.3-codex', label: 'GPT-5.3 Codex' },
        { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
        { value: 'gpt-5.2', label: 'GPT-5.2' },
        { value: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max' },
        { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini' },
    ],
    cursor: [],
    gemini: [
        { value: 'auto', label: 'Auto' },
        { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
    opencode: [],
    pi: [
        { value: 'auto', label: 'Auto' },
        { value: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet' },
        { value: 'anthropic/claude-opus-4-20250514', label: 'Claude Opus' },
    ],
}

export const CODEX_REASONING_EFFORT_OPTIONS: { value: CodexReasoningEffort; label: string }[] = ([
    'default',
    'low',
    'medium',
    'high',
    'xhigh'
] as const).map((value) => ({
    value,
    label: getLevelOptionLabel(value)
}))

export const CLAUDE_EFFORT_OPTIONS: { value: ClaudeEffort; label: string }[] = ([
    'auto',
    'medium',
    'high',
    'max'
] as const).map((value) => ({
    value,
    label: getLevelOptionLabel(value)
}))

export const PI_THINKING_LEVEL_OPTIONS: { value: PiThinkingLevel; label: string }[] = PI_THINKING_LEVELS.map((value) => ({
    value,
    label: getLevelOptionLabel(value)
}))
