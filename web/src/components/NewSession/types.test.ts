import { CLAUDE_MODEL_PRESETS, getClaudeModelLabel } from '@hapi/protocol'
import { describe, expect, it } from 'vitest'
import { CLAUDE_EFFORT_OPTIONS, MODEL_OPTIONS, PI_THINKING_LEVEL_OPTIONS } from './types'

describe('Claude model options', () => {
    it('includes 1m model options in the expected order', () => {
        expect(MODEL_OPTIONS.claude).toEqual([
            { value: 'auto', label: 'Auto' },
            { value: 'opus', label: 'Opus' },
            { value: 'opus[1m]', label: 'Opus 1M' },
            { value: 'sonnet', label: 'Sonnet' },
            { value: 'sonnet[1m]', label: 'Sonnet 1M' },
        ])
    })

    it('exposes friendly labels for Claude model presets', () => {
        expect(CLAUDE_MODEL_PRESETS).toEqual(['sonnet', 'sonnet[1m]', 'opus', 'opus[1m]'])
        expect(getClaudeModelLabel('sonnet[1m]')).toBe('Sonnet 1M')
        expect(getClaudeModelLabel('opus[1m]')).toBe('Opus 1M')
    })
})

describe('Claude effort options', () => {
    it('matches supported effort presets in expected order', () => {
        expect(CLAUDE_EFFORT_OPTIONS).toEqual([
            { value: 'auto', label: 'Auto' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'max', label: 'Max' },
        ])
    })
})

describe('PI options', () => {
    it('exposes PI model presets in expected order', () => {
        expect(MODEL_OPTIONS.pi).toEqual([
            { value: 'auto', label: 'Auto' },
            { value: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet' },
            { value: 'anthropic/claude-opus-4-20250514', label: 'Claude Opus' },
        ])
    })

    it('exposes supported thinking levels in expected order', () => {
        expect(PI_THINKING_LEVEL_OPTIONS).toEqual([
            { value: 'off', label: 'Off' },
            { value: 'minimal', label: 'Minimal' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'xhigh', label: 'XHigh' },
        ])
    })
})
