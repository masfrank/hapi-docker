import { useEffect, useMemo, useState } from 'react'
import type { ApiClient } from '@/api/client'
import type { ChatToolCall } from '@/chat/types'
import { Spinner } from '@/components/Spinner'
import {
    isCodexMcpElicitationToolName,
    parseCodexMcpElicitationInput
} from '@/components/ToolCard/codexMcpElicitation'
import { usePlatform } from '@/hooks/usePlatform'

function ActionButton(props: {
    label: string
    tone: 'allow' | 'deny' | 'neutral'
    loading?: boolean
    disabled: boolean
    onClick: () => void
}) {
    const base = 'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-left transition-colors disabled:pointer-events-none disabled:opacity-50 hover:bg-[var(--app-subtle-bg)]'
    const tone = props.tone === 'allow'
        ? 'text-emerald-600'
        : props.tone === 'deny'
            ? 'text-red-600'
            : 'text-[var(--app-link)]'

    return (
        <button
            type="button"
            className={`${base} ${tone}`}
            disabled={props.disabled}
            aria-busy={props.loading === true}
            onClick={props.onClick}
        >
            <span className="flex-1">{props.label}</span>
            {props.loading ? (
                <span className="ml-2 shrink-0">
                    <Spinner size="sm" label={null} className="text-current" />
                </span>
            ) : null}
        </button>
    )
}

export function CodexMcpElicitationFooter(props: {
    api: ApiClient
    sessionId: string
    tool: ChatToolCall
    disabled: boolean
    onDone: () => void
}) {
    const { haptic } = usePlatform()
    const parsed = useMemo(() => parseCodexMcpElicitationInput(props.tool.input), [props.tool.input])
    const [loading, setLoading] = useState<'accept' | 'decline' | 'cancel' | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(null)
        setError(null)
    }, [props.tool.id])

    if (!isCodexMcpElicitationToolName(props.tool.name)) return null
    if (!parsed) return null
    if (props.tool.state !== 'running' && props.tool.state !== 'pending') return null

    const run = async (action: () => Promise<void>) => {
        if (props.disabled) return
        setError(null)
        try {
            await action()
            haptic.notification('success')
            props.onDone()
        } catch (e) {
            haptic.notification('error')
            setError(e instanceof Error ? e.message : 'Request failed')
        }
    }

    const submitAccept = async () => {
        if (loading) return
        setLoading('accept')

        let content: unknown | null = null
        if (parsed.mode === 'form') {
            content = {}
        }

        await run(() => props.api.respondToMcpElicitation(props.sessionId, parsed.requestId, {
            action: 'accept',
            content
        }))
        setLoading(null)
    }

    const submitSimple = async (action: 'decline' | 'cancel') => {
        if (loading) return
        setLoading(action)
        await run(() => props.api.respondToMcpElicitation(props.sessionId, parsed.requestId, {
            action,
            content: null
        }))
        setLoading(null)
    }

    return (
        <div className="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
            {error ? (
                <div className="mb-2 text-xs text-red-600">
                    {error}
                </div>
            ) : null}

            <div className="flex flex-col gap-1">
                <ActionButton
                    label={parsed.mode === 'url' ? 'Open and continue' : 'Submit'}
                    tone="allow"
                    loading={loading === 'accept'}
                    disabled={props.disabled || loading !== null}
                    onClick={submitAccept}
                />
                <ActionButton
                    label="Decline"
                    tone="neutral"
                    loading={loading === 'decline'}
                    disabled={props.disabled || loading !== null}
                    onClick={() => submitSimple('decline')}
                />
                <ActionButton
                    label="Cancel"
                    tone="deny"
                    loading={loading === 'cancel'}
                    disabled={props.disabled || loading !== null}
                    onClick={() => submitSimple('cancel')}
                />
            </div>
        </div>
    )
}
