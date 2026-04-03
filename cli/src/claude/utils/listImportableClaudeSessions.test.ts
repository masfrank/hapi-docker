import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { listImportableClaudeSessions } from './listImportableClaudeSessions'

describe('listImportableClaudeSessions', () => {
    let testDir: string

    beforeEach(async () => {
        testDir = join(tmpdir(), `claude-importable-sessions-${Date.now()}`)
        await mkdir(testDir, { recursive: true })
    })

    afterEach(async () => {
        if (existsSync(testDir)) {
            await rm(testDir, { recursive: true, force: true })
        }
    })

    it('derives Claude importable session summaries from project jsonl files', async () => {
        const olderDir = join(testDir, '2026', '04', '03')
        const newerDir = join(testDir, '2026', '04', '04')
        await mkdir(olderDir, { recursive: true })
        await mkdir(newerDir, { recursive: true })

        const olderSessionId = 'session-a'
        const olderFile = join(olderDir, `${olderSessionId}.jsonl`)
        await writeFile(
            olderFile,
            [
                JSON.stringify({
                    type: 'session_meta',
                    payload: {
                        id: olderSessionId,
                        cwd: '/work/project-a',
                        timestamp: '2026-04-03T09:00:00.000Z'
                    }
                }),
                JSON.stringify({
                    type: 'assistant',
                    uuid: 'assistant-older-1',
                    cwd: '/work/project-a',
                    timestamp: '2026-04-03T09:00:01.000Z',
                    message: {
                        role: 'assistant',
                        content: [{ type: 'text', text: 'Acknowledged' }]
                    }
                })
            ].join('\n') + '\n'
        )

        const newerSessionId = 'session-b'
        const newerFile = join(newerDir, 'project-b-transcript.jsonl')
        await writeFile(
            newerFile,
            [
                JSON.stringify({
                    type: 'session_meta',
                    payload: {
                        id: newerSessionId,
                        cwd: '/work/project-b',
                        timestamp: '2026-04-04T12:00:00.000Z'
                    }
                }),
                JSON.stringify({
                    type: 'user',
                    uuid: 'user-0',
                    cwd: '/work/project-b',
                    timestamp: '2026-04-04T12:00:00.500Z',
                    message: {
                        role: 'user',
                        content: '<task-notification> internal Claude injection'
                    }
                }),
                JSON.stringify({
                    type: 'user',
                    uuid: 'user-1',
                    cwd: '/work/project-b',
                    timestamp: '2026-04-04T12:00:01.000Z',
                    message: {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Continue the' },
                            { type: 'text', text: 'refactor' }
                        ]
                    }
                }),
                JSON.stringify({
                    type: 'user',
                    uuid: 'user-2',
                    cwd: '/work/project-b',
                    timestamp: '2026-04-04T12:00:03.000Z',
                    message: {
                        role: 'user',
                        content: 'Ignore this later user prompt'
                    }
                }),
                JSON.stringify({
                    type: 'assistant',
                    uuid: 'assistant-1',
                    cwd: '/work/project-b',
                    timestamp: '2026-04-04T12:00:02.000Z',
                    message: {
                        role: 'assistant',
                        content: [{ type: 'text', text: 'Working on it' }]
                    }
                })
            ].join('\n') + '\n'
        )

        const ignoredSessionFile = join(newerDir, 'ignored.jsonl')
        await writeFile(
            ignoredSessionFile,
            [
                JSON.stringify({
                    type: 'session_meta',
                    payload: {
                        id: 'ignored-session',
                        cwd: '/work/ignored',
                        timestamp: '2026-04-04T13:00:00.000Z'
                    }
                }),
                JSON.stringify({
                    type: 'system',
                    subtype: 'init',
                    uuid: 'system-ignored'
                })
            ].join('\n') + '\n'
        )

        const result = await listImportableClaudeSessions({ rootDir: testDir })

        expect(result.sessions.map((session) => session.externalSessionId)).toEqual([
            newerSessionId,
            olderSessionId
        ])

        expect(result.sessions[0]).toMatchObject({
            agent: 'claude',
            externalSessionId: newerSessionId,
            cwd: '/work/project-b',
            timestamp: Date.parse('2026-04-04T12:00:00.000Z'),
            transcriptPath: newerFile,
            previewPrompt: 'Continue the refactor',
            previewTitle: 'Continue the refactor'
        })

        expect(result.sessions[1]).toMatchObject({
            agent: 'claude',
            externalSessionId: olderSessionId,
            cwd: '/work/project-a',
            timestamp: Date.parse('2026-04-03T09:00:00.000Z'),
            transcriptPath: olderFile,
            previewPrompt: null,
            previewTitle: 'project-a'
        })

        expect(result.sessions.find((session) => session.externalSessionId === 'ignored-session')).toBeUndefined()
    })
})
