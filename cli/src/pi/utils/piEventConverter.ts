import { randomUUID } from 'node:crypto'
import type { AssistantMessageEvent } from '@mariozechner/pi-ai'
import type { AgentSessionEvent } from '@mariozechner/pi-coding-agent'

type HapiAgentMessage = {
    type: string
    id: string
    [key: string]: unknown
}

export class PiEventConverter {
    private textBuffer = ''
    private thinkingBuffer = ''

    convert(event: AgentSessionEvent): HapiAgentMessage[] {
        switch (event.type) {
            case 'agent_start':
                return []

            case 'agent_end':
                this.reset()
                return []

            case 'message_update':
                return this.handleMessageUpdate(event)

            case 'message_end':
                return this.handleMessageEnd(event)

            case 'tool_execution_start':
                return [{
                    type: 'tool-call',
                    name: event.toolName,
                    callId: event.toolCallId,
                    input: event.args,
                    id: randomUUID()
                }]

            case 'tool_execution_end':
                return [{
                    type: 'tool-call-result',
                    callId: event.toolCallId,
                    output: event.result,
                    is_error: event.isError,
                    id: randomUUID()
                }]

            case 'compaction_start':
            case 'compaction_end':
            case 'auto_retry_start':
            case 'auto_retry_end':
            case 'turn_start':
            case 'turn_end':
            case 'message_start':
            case 'tool_execution_update':
                return []

            default:
                return []
        }
    }

    private handleMessageUpdate(event: { assistantMessageEvent: unknown }): HapiAgentMessage[] {
        const delta = event.assistantMessageEvent as AssistantMessageEvent

        switch (delta.type) {
            case 'text_delta':
                this.textBuffer += delta.delta ?? ''
                return []

            case 'thinking_delta':
                this.thinkingBuffer += delta.delta ?? ''
                return []

            case 'thinking_end': {
                const thinking = this.thinkingBuffer
                this.thinkingBuffer = ''
                if (thinking) {
                    const callId = randomUUID()
                    return [
                        {
                            type: 'tool-call',
                            name: 'PiThinking',
                            callId,
                            input: { thinking },
                            id: randomUUID()
                        },
                        {
                            type: 'tool-call-result',
                            callId,
                            output: thinking,
                            is_error: false,
                            id: randomUUID()
                        }
                    ]
                }
                return []
            }

            case 'toolcall_end':
                if (!delta.toolCall) return []
                return [{
                    type: 'tool-call',
                    name: delta.toolCall.name,
                    callId: delta.toolCall.id,
                    input: delta.toolCall.arguments,
                    id: randomUUID()
                }]

            default:
                return []
        }
    }

    private handleMessageEnd(event: { message: unknown }): HapiAgentMessage[] {
        const message = event.message as { role?: string } | null
        if (message?.role !== 'assistant') {
            return []
        }
        const text = this.textBuffer
        this.textBuffer = ''
        if (!text) {
            return []
        }
        return [{
            type: 'message',
            message: text,
            id: randomUUID()
        }]
    }

    reset(): void {
        this.textBuffer = ''
        this.thinkingBuffer = ''
    }
}
