export type ImportableSessionAgent = 'codex' | 'claude'

export type ImportableCodexSessionSummary = {
    agent: 'codex'
    externalSessionId: string
    cwd: string | null
    timestamp: number | null
    transcriptPath: string
    previewTitle: string | null
    previewPrompt: string | null
}

export type ImportableClaudeSessionSummary = {
    agent: 'claude'
    externalSessionId: string
    cwd: string | null
    timestamp: number | null
    transcriptPath: string
    previewTitle: string | null
    previewPrompt: string | null
}

export type ImportableSessionSummary =
    | ImportableCodexSessionSummary
    | ImportableClaudeSessionSummary

export type RpcListImportableSessionsRequest = {
    agent: ImportableSessionAgent
}

export type RpcListImportableSessionsResponse = {
    sessions: ImportableSessionSummary[]
}
