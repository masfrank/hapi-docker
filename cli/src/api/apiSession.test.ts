import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { isExternalUserMessage } from './apiSession'

describe('isExternalUserMessage', () => {
    const baseUserMsg = {
        type: 'user' as const,
        uuid: 'test-uuid',
        userType: 'external' as const,
        isSidechain: false,
        message: { role: 'user', content: 'hello' },
    }

    it('returns true for a real user text message', () => {
        expect(isExternalUserMessage(baseUserMsg)).toBe(true)
    })

    it('returns false when userType is missing (system-injected messages like <task-notification>)', () => {
        const { userType: _, ...noUserType } = baseUserMsg
        expect(isExternalUserMessage(noUserType as never)).toBe(false)
    })

    it('returns false when isMeta is true (skill injections)', () => {
        expect(isExternalUserMessage({ ...baseUserMsg, isMeta: true })).toBe(false)
    })

    it('returns false when isSidechain is true', () => {
        expect(isExternalUserMessage({ ...baseUserMsg, isSidechain: true })).toBe(false)
    })

    it('returns false when content is an array (tool results)', () => {
        expect(
            isExternalUserMessage({
                ...baseUserMsg,
                message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'y' }] },
            } as never)
        ).toBe(false)
    })

    it('returns false for assistant messages', () => {
        expect(
            isExternalUserMessage({
                type: 'assistant',
                uuid: 'test-uuid',
                message: { role: 'assistant', content: 'hi' },
            } as never)
        ).toBe(false)
    })
})

/**
 * Validates that all user messages with string content in the JSONL fixtures
 * carry userType:'external' — the invariant isExternalUserMessage() depends on.
 *
 * If this test fails it means Claude Code changed how it writes session logs
 * and the guard needs to be revisited.
 */
describe('JSONL fixture invariant: real user messages have userType:"external"', () => {
    const fixtureDir = join(__dirname, '../claude/utils/__fixtures__')
    const fixtures = readdirSync(fixtureDir).filter(f => f.endsWith('.jsonl'))

    it('fixture files exist', () => {
        expect(fixtures.length).toBeGreaterThan(0)
    })

    for (const file of fixtures) {
        it(`${file}: every type:user string-content message has userType:'external'`, () => {
            const lines = readFileSync(join(fixtureDir, file), 'utf-8')
                .split('\n')
                .filter(Boolean)

            for (const line of lines) {
                const msg = JSON.parse(line)
                if (
                    msg.type === 'user' &&
                    msg.isMeta !== true &&
                    msg.isSidechain !== true &&
                    typeof msg.message?.content === 'string'
                ) {
                    expect(
                        msg.userType,
                        `message uuid=${msg.uuid} in ${file} is a real user string message but lacks userType:'external'`
                    ).toBe('external')
                }
            }
        })
    }
})

