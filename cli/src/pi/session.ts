import { AgentSessionBase, type AgentSessionBaseOptions } from '@/agent/sessionBase'
import type { Metadata } from '@/api/types'
import type { ApiSessionClient } from '@/lib'
import type { PiEnhancedMode, PiThinkingLevel, PiPermissionMode } from './piTypes'

export class PiSession extends AgentSessionBase<PiEnhancedMode> {
    readonly startedBy: 'runner' | 'terminal'
    protected piThinkingLevel?: PiThinkingLevel

    constructor(opts: Omit<AgentSessionBaseOptions<PiEnhancedMode>, 'sessionLabel' | 'sessionIdLabel' | 'applySessionIdToMetadata'> & {
        startedBy: 'runner' | 'terminal'
        piThinkingLevel?: PiThinkingLevel
        permissionMode?: PiPermissionMode
    }) {
        super({
            ...opts,
            sessionLabel: 'PiSession',
            sessionIdLabel: 'Pi',
            applySessionIdToMetadata: (metadata, sessionId) => ({
                ...metadata,
                piSessionId: sessionId
            }),
            permissionMode: opts.permissionMode
        })
        this.startedBy = opts.startedBy
        this.piThinkingLevel = opts.piThinkingLevel
    }

    setThinkingLevel(level: PiThinkingLevel): void {
        this.piThinkingLevel = level
    }

    getThinkingLevel(): PiThinkingLevel | undefined {
        return this.piThinkingLevel
    }

    setPermissionMode = (mode: PiPermissionMode): void => {
        this.permissionMode = mode
    }

    setSessionInfo = (sessionId: string, sessionPath: string | null): void => {
        this.onSessionFound(sessionId)
        if (!sessionPath) {
            return
        }
        this.client.updateMetadata((metadata) => this.applySessionPathToMetadata(metadata, sessionPath))
    }

    sendAgentMessage = (message: unknown): void => {
        this.client.sendAgentMessage(message)
    }

    sendSessionEvent = (event: Parameters<ApiSessionClient['sendSessionEvent']>[0]): void => {
        this.client.sendSessionEvent(event)
    }

    private applySessionPathToMetadata = (metadata: Metadata, sessionPath: string): Metadata => ({
        ...metadata,
        piSessionPath: sessionPath
    })
}
