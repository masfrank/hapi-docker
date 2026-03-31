import type { ToolViewProps } from '@/components/ToolCard/views/_all'
import {
    parseCodexMcpElicitationInput,
    parseCodexMcpElicitationResult
} from '@/components/ToolCard/codexMcpElicitation'
import { CodeBlock } from '@/components/CodeBlock'

export function CodexMcpElicitationView(props: ToolViewProps) {
    const input = parseCodexMcpElicitationInput(props.block.tool.input)
    const result = parseCodexMcpElicitationResult(props.block.tool.result)

    if (!input) {
        return null
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
                <div className="text-xs font-medium text-[var(--app-hint)]">Server</div>
                <div className="mt-1 text-sm text-[var(--app-fg)]">{input.serverName}</div>
                {input.message ? (
                    <>
                        <div className="mt-3 text-xs font-medium text-[var(--app-hint)]">Message</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--app-fg)]">{input.message}</div>
                    </>
                ) : null}
                {input.mode === 'form' ? (
                    <>
                        <div className="mt-3 text-xs font-medium text-[var(--app-hint)]">Requested schema</div>
                        <div className="mt-1">
                            <CodeBlock code={JSON.stringify(input.requestedSchema, null, 2)} language="json" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mt-3 text-xs font-medium text-[var(--app-hint)]">URL</div>
                        <a
                            href={input.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-sm text-[var(--app-link)] underline"
                        >
                            {input.url}
                        </a>
                    </>
                )}
            </div>

            {result ? (
                <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
                    <div className="text-xs font-medium text-[var(--app-hint)]">Response</div>
                    <div className="mt-1 text-sm text-[var(--app-fg)]">{result.action}</div>
                    {result.content !== null ? (
                        <div className="mt-3">
                            <CodeBlock code={JSON.stringify(result.content, null, 2)} language="json" />
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}
