import { isObject } from '@hapi/protocol'

export type CodexMcpElicitationInput =
    | {
        requestId: string
        threadId: string
        turnId: string | null
        serverName: string
        mode: 'form'
        message: string
        requestedSchema: Record<string, unknown>
        url?: undefined
        elicitationId?: undefined
    }
    | {
        requestId: string
        threadId: string
        turnId: string | null
        serverName: string
        mode: 'url'
        message: string
        url: string
        elicitationId?: string
        requestedSchema?: undefined
    }

export type CodexMcpElicitationResult = {
    action: 'accept' | 'decline' | 'cancel'
    content: unknown | null
}

export function isCodexMcpElicitationToolName(toolName: string): boolean {
    return toolName === 'CodexMcpElicitation'
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function parseCodexMcpElicitationInput(input: unknown): CodexMcpElicitationInput | null {
    if (!isObject(input)) return null

    const requestId = asString(input.requestId)
    const threadId = asString(input.threadId)
    const serverName = asString(input.serverName)
    const mode = input.mode
    const message = asString(input.message) ?? ''
    const turnId = typeof input.turnId === 'string' ? input.turnId : null

    if (!requestId || !threadId || !serverName) return null

    if (mode === 'form' && isObject(input.requestedSchema)) {
        return {
            requestId,
            threadId,
            turnId,
            serverName,
            mode,
            message,
            requestedSchema: input.requestedSchema as Record<string, unknown>
        }
    }

    if (mode === 'url') {
        const url = asString(input.url)
        if (!url) return null
        return {
            requestId,
            threadId,
            turnId,
            serverName,
            mode,
            message,
            url,
            elicitationId: asString(input.elicitationId) ?? undefined
        }
    }

    return null
}

export function parseCodexMcpElicitationResult(result: unknown): CodexMcpElicitationResult | null {
    if (typeof result === 'string') {
        try {
            return parseCodexMcpElicitationResult(JSON.parse(result))
        } catch {
            return null
        }
    }

    if (!isObject(result)) return null
    const action = result.action
    if (action !== 'accept' && action !== 'decline' && action !== 'cancel') {
        return null
    }

    return {
        action,
        content: result.content ?? null
    }
}
