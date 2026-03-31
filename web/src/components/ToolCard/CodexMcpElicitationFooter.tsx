import { useEffect, useMemo, useState } from 'react'
import type { ApiClient } from '@/api/client'
import type { ChatToolCall } from '@/chat/types'
import { CodeBlock } from '@/components/CodeBlock'
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
    const [jsonContent, setJsonContent] = useState('{}')
    const [loading, setLoading] = useState<'accept' | 'decline' | 'cancel' | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setLoading(null)
        setError(null)
        setJsonContent('{}')
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
            try {
                content = JSON.parse(jsonContent)
            } catch {
                setLoading(null)
                setError('Form content must be valid JSON')
                return
            }
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
            <div className="text-xs text-[var(--app-hint)]">
                MCP elicitation request from {parsed.serverName}
            </div>

            {parsed.message ? (
                <div className="mt-2 text-sm text-[var(--app-fg)] whitespace-pre-wrap">
                    {parsed.message}
                </div>
            ) : null}

            {parsed.mode === 'form' ? (
                <div className="mt-3 flex flex-col gap-2">
                    <div className="text-xs font-medium text-[var(--app-hint)]">Schema</div>
                    <CodeBlock code={JSON.stringify(parsed.requestedSchema, null, 2)} language="json" />
                    <div className="text-xs font-medium text-[var(--app-hint)]">Content JSON</div>
                    <textarea
                        value={jsonContent}
                        onChange={(e) => setJsonContent(e.target.value)}
                        disabled={props.disabled || loading !== null}
                        spellCheck={false}
                        className="min-h-[120px] w-full resize-y rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 font-mono text-sm text-[var(--app-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--app-button)] focus:border-transparent disabled:opacity-50"
                    />
                </div>
            ) : (
                <div className="mt-3">
                    <a
                        href={parsed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--app-link)] underline break-all"
                    >
                        {parsed.url}
                    </a>
                </div>
            )}

            {error ? (
                <div className="mt-2 text-xs text-red-600">
                    {error}
                </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-1">
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
