import { describe, expect, it } from 'vitest'
import { annotateSubagentSidechains } from './subagentSidechain'
import type { NormalizedMessage } from './types'

function agentToolCall(
    messageId: string,
    toolUseId: string,
    name: string,
    input: unknown,
    createdAt: number
): NormalizedMessage {
    return {
        id: messageId,
        localId: null,
        createdAt,
        role: 'agent',
        isSidechain: false,
        content: [{
            type: 'tool-call',
            id: toolUseId,
            name,
            input,
            description: null,
            uuid: `${messageId}-uuid`,
            parentUUID: null
        }]
    }
}

function childAgentMessage(
    id: string,
    text: string,
    createdAt: number,
    sidechainKey: string
): NormalizedMessage {
    return {
        id,
        localId: null,
        createdAt,
        role: 'agent',
        isSidechain: true,
        sidechainKey,
        meta: {
            subagent: {
                kind: 'message',
                sidechainKey
            }
        },
        content: [{
            type: 'text',
            text,
            uuid: `${id}-uuid`,
            parentUUID: null
        }]
    }
}

describe('annotateSubagentSidechains', () => {
    it('preserves Claude sidechain keys that point at the Task tool-use id', () => {
        const messages: NormalizedMessage[] = [
            agentToolCall('msg-parent', 'task-1', 'Task', { prompt: 'Investigate flaky test' }, 1),
            childAgentMessage('child-user', 'child prompt', 2, 'task-1'),
            childAgentMessage('child-agent', 'child answer', 3, 'task-1')
        ]

        const result = annotateSubagentSidechains(messages)

        expect(result[1]).toMatchObject({ isSidechain: true, sidechainKey: 'task-1' })
        expect(result[2]).toMatchObject({ isSidechain: true, sidechainKey: 'task-1' })
    })

    it('does not rewrite explicit Claude sidechain keys to the enclosing message id when multiple tool calls exist', () => {
        const messages: NormalizedMessage[] = [
            agentToolCall('msg-parent', 'other-tool', 'OtherTool', { prompt: 'ignore' }, 1),
            agentToolCall('msg-parent', 'task-1', 'Task', { prompt: 'Investigate flaky test' }, 1),
            childAgentMessage('child-user', 'child prompt', 2, 'task-1')
        ]

        const result = annotateSubagentSidechains(messages)

        expect(result[2]).toMatchObject({ isSidechain: true, sidechainKey: 'task-1' })
        expect(result[2]).not.toMatchObject({ sidechainKey: 'msg-parent' })
    })
})
