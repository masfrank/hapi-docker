import { beforeEach, describe, expect, it, vi } from 'vitest'

const listImportableCodexSessionsMock = vi.hoisted(() => vi.fn())
const importableSessionsResponse = {
    sessions: [
        {
            agent: 'codex',
            externalSessionId: 'codex-session-1',
            cwd: '/work/project',
            timestamp: 1712131200000,
            transcriptPath: '/sessions/codex-session-1.jsonl',
            previewTitle: 'Project draft',
            previewPrompt: 'Build the project'
        }
    ]
}

vi.mock('@/codex/utils/listImportableCodexSessions', () => ({
    listImportableCodexSessions: listImportableCodexSessionsMock
}))

vi.mock('@/modules/common/registerCommonHandlers', () => ({
    registerCommonHandlers: vi.fn()
}))

vi.mock('@/utils/invokedCwd', () => ({
    getInvokedCwd: vi.fn(() => '/workspace')
}))

vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn()
    }
}))

import { ApiMachineClient } from './apiMachine'

describe('ApiMachineClient list-importable-sessions RPC', () => {
    beforeEach(() => {
        listImportableCodexSessionsMock.mockReset()
        listImportableCodexSessionsMock.mockResolvedValue(importableSessionsResponse)
    })

    it('registers the RPC and returns codex scanner results only for codex', async () => {
        const machine = {
            id: 'machine-1',
            metadata: null,
            metadataVersion: 0,
            runnerState: null,
            runnerStateVersion: 0
        } as never

        const client = new ApiMachineClient('token', machine)
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession: vi.fn(),
            requestShutdown: vi.fn()
        })

        const rpcManager = client as unknown as {
            rpcHandlerManager: {
                hasHandler: (method: string) => boolean
                handleRequest: (request: { method: string; params: string }) => Promise<string>
            }
        }

        expect(rpcManager.rpcHandlerManager.hasHandler('list-importable-sessions')).toBe(true)

        await expect(
            rpcManager.rpcHandlerManager.handleRequest({
                method: 'machine-1:list-importable-sessions',
                params: JSON.stringify({ agent: 'codex' })
            })
        ).resolves.toBe(JSON.stringify(importableSessionsResponse))

        await expect(
            rpcManager.rpcHandlerManager.handleRequest({
                method: 'machine-1:list-importable-sessions',
                params: JSON.stringify({ agent: 'claude' })
            })
        ).resolves.toBe(JSON.stringify({ sessions: [] }))

        expect(listImportableCodexSessionsMock).toHaveBeenCalledTimes(1)
    })
})
