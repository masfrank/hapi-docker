import { describe, test, expect } from 'bun:test'
import { applyTeamStateDelta, extractTeamStateFromMessageContent } from './teams'
import type { TeamState, TeamTask } from '@hapi/protocol/types'

const baseTeamState: TeamState = {
    teamName: 'test-team',
    members: [{ name: 'lead', status: 'active' }],
    tasks: [],
    messages: [],
    updatedAt: 1000
}

function getTasks(result: TeamState | null | undefined): TeamTask[] {
    expect(result).toBeTruthy()
    return result!.tasks ?? []
}

// Helper to create a message content envelope with tool_use blocks
function makeToolCallMessage(tools: Array<{ name: string; input: Record<string, unknown> }>) {
    return {
        role: 'assistant',
        content: {
            type: 'output',
            data: {
                type: 'assistant',
                message: {
                    content: tools.map((t, i) => ({
                        type: 'tool_use',
                        id: `tool_${i}`,
                        name: t.name,
                        input: t.input
                    }))
                }
            }
        }
    }
}

describe('applyTeamStateDelta - orphan TaskUpdate', () => {
    test('should skip inserting task without title (orphan TaskUpdate)', () => {
        const result = applyTeamStateDelta(baseTeamState, {
            tasks: [{ id: 'task-1', status: 'in_progress' } as any],
            updatedAt: 2000
        })

        expect(getTasks(result)).toEqual([])
    })

    test('should insert task when title is present (normal TaskCreate)', () => {
        const result = applyTeamStateDelta(baseTeamState, {
            tasks: [{ id: 'task-1', title: 'Do something', status: 'pending' }],
            updatedAt: 2000
        })

        const tasks = getTasks(result)
        expect(tasks).toHaveLength(1)
        expect(tasks[0]).toMatchObject({ title: 'Do something' })
    })

    test('should update existing task even without title (normal TaskUpdate)', () => {
        const stateWithTask: TeamState = {
            ...baseTeamState,
            tasks: [{ id: 'task-1', title: 'Do something', status: 'pending' }]
        }

        const result = applyTeamStateDelta(stateWithTask, {
            tasks: [{ id: 'task-1', status: 'completed' } as any],
            updatedAt: 2000
        })

        const tasks = getTasks(result)
        expect(tasks).toHaveLength(1)
        expect(tasks[0]).toMatchObject({ title: 'Do something', status: 'completed' })
    })

    test('should handle mixed: existing task update + orphan new task', () => {
        const stateWithTask: TeamState = {
            ...baseTeamState,
            tasks: [{ id: 'task-1', title: 'Existing task', status: 'pending' }]
        }

        const result = applyTeamStateDelta(stateWithTask, {
            tasks: [
                { id: 'task-1', status: 'in_progress' } as any,
                { id: 'task-2', status: 'completed' } as any,
            ],
            updatedAt: 2000
        })

        const tasks = getTasks(result)
        expect(tasks).toHaveLength(1)
        expect(tasks[0]).toMatchObject({ id: 'task-1', status: 'in_progress' })
    })
})

describe('extractTeamStateFromMessageContent - Agent tool', () => {
    test('should extract Agent tool as team member spawn', () => {
        const msg = makeToolCallMessage([{
            name: 'Agent',
            input: {
                name: 'researcher',
                description: 'Research API docs',
                prompt: 'Find all API endpoints',
                subagent_type: 'Explore',
                team_name: 'my-team'
            }
        }])

        const delta = extractTeamStateFromMessageContent(msg)
        expect(delta).toBeTruthy()
        expect(delta!.members).toHaveLength(1)
        expect(delta!.members![0]).toMatchObject({
            name: 'researcher',
            agentType: 'Explore',
            status: 'active'
        })
        expect(delta!.tasks).toHaveLength(1)
        expect(delta!.tasks![0]).toMatchObject({
            id: 'agent:researcher',
            title: 'Research API docs',
            status: 'in_progress',
            owner: 'researcher'
        })
    })

    test('should extract Agent tool with background and worktree flags', () => {
        const msg = makeToolCallMessage([{
            name: 'Agent',
            input: {
                name: 'builder',
                description: 'Build the project',
                run_in_background: true,
                isolation: 'worktree'
            }
        }])

        const delta = extractTeamStateFromMessageContent(msg)
        expect(delta).toBeTruthy()
        expect(delta!.members![0]).toMatchObject({
            name: 'builder',
            status: 'active',
            runInBackground: true,
            isolation: 'worktree'
        })
    })

    test('should extract Agent tool without team_name (uses current team context)', () => {
        const msg = makeToolCallMessage([{
            name: 'Agent',
            input: {
                name: 'worker',
                description: 'Do work'
            }
        }])

        const delta = extractTeamStateFromMessageContent(msg)
        expect(delta).toBeTruthy()
        expect(delta!.members).toHaveLength(1)
        expect(delta!.members![0].name).toBe('worker')
    })

    test('should still extract Task tool with team_name as legacy spawn', () => {
        const msg = makeToolCallMessage([{
            name: 'Task',
            input: {
                name: 'legacy-agent',
                team_name: 'my-team',
                description: 'Legacy task'
            }
        }])

        const delta = extractTeamStateFromMessageContent(msg)
        expect(delta).toBeTruthy()
        expect(delta!.members).toHaveLength(1)
        expect(delta!.members![0].name).toBe('legacy-agent')
    })

    test('should NOT extract Task tool without team_name (regular task)', () => {
        const msg = makeToolCallMessage([{
            name: 'Task',
            input: {
                description: 'Regular non-team task'
            }
        }])

        const delta = extractTeamStateFromMessageContent(msg)
        expect(delta).toBeNull()
    })

    test('should extract multiple tools from same message', () => {
        const msg = makeToolCallMessage([
            {
                name: 'TeamCreate',
                input: { team_name: 'project-x', description: 'Project team' }
            },
            {
                name: 'Agent',
                input: { name: 'dev-1', description: 'Frontend work', subagent_type: 'general-purpose' }
            }
        ])

        const delta = extractTeamStateFromMessageContent(msg)
        // TeamCreate's _action: 'create' overrides the subsequent Agent merge
        // because mergeDelta gives priority to 'create'
        expect(delta).toBeTruthy()
        expect(delta!.teamName).toBe('project-x')
    })

    test('should extract SendMessage with shutdown_request', () => {
        const msg = makeToolCallMessage([{
            name: 'SendMessage',
            input: {
                type: 'shutdown_request',
                recipient: 'researcher',
                summary: 'Work is done'
            }
        }])

        const delta = extractTeamStateFromMessageContent(msg)
        expect(delta).toBeTruthy()
        expect(delta!.messages).toHaveLength(1)
        expect(delta!.messages![0].type).toBe('shutdown_request')
        expect(delta!.members).toHaveLength(1)
        expect(delta!.members![0]).toMatchObject({
            name: 'researcher',
            status: 'shutdown'
        })
    })
})

describe('applyTeamStateDelta - member properties', () => {
    test('should preserve new member fields (description, isolation, runInBackground)', () => {
        const result = applyTeamStateDelta(baseTeamState, {
            _action: 'update',
            members: [{
                name: 'worker',
                agentType: 'Explore',
                status: 'active',
                description: 'Search codebase',
                isolation: 'worktree',
                runInBackground: true
            }],
            updatedAt: 2000
        })

        expect(result).toBeTruthy()
        const members = result!.members ?? []
        const worker = members.find(m => m.name === 'worker')
        expect(worker).toBeTruthy()
        expect(worker!.description).toBe('Search codebase')
        expect(worker!.isolation).toBe('worktree')
        expect(worker!.runInBackground).toBe(true)
    })

    test('should merge member updates preserving existing fields', () => {
        const stateWithMember: TeamState = {
            ...baseTeamState,
            members: [{
                name: 'worker',
                agentType: 'Explore',
                status: 'active',
                description: 'Search codebase',
                isolation: 'worktree'
            }]
        }

        const result = applyTeamStateDelta(stateWithMember, {
            _action: 'update',
            members: [{ name: 'worker', status: 'completed' }],
            updatedAt: 2000
        })

        const worker = result!.members!.find(m => m.name === 'worker')
        expect(worker!.status).toBe('completed')
        expect(worker!.description).toBe('Search codebase')
        expect(worker!.isolation).toBe('worktree')
    })
})
