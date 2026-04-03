export type NormalizedSubagentLifecycleStatus =
    | 'waiting'
    | 'running'
    | 'completed'
    | 'error'
    | 'closed'

export type NormalizedSubagentMeta = {
    sidechainKey: string
    kind: 'spawn' | 'message' | 'status' | 'title'
    prompt?: string
    title?: string
    status?: NormalizedSubagentLifecycleStatus
    agentId?: string
    nickname?: string
}
