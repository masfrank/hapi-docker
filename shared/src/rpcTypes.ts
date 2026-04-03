export type ImportableSessionAgent = 'codex'

export type ImportableCodexSessionSummary = {
    agent: 'codex'
    externalSessionId: string
    cwd: string | null
    timestamp: number | null
    transcriptPath: string
    previewTitle: string | null
    previewPrompt: string | null
}

export type RpcListImportableSessionsRequest = {
    agent: ImportableSessionAgent
}

export type RpcListImportableSessionsResponse = {
    sessions: ImportableCodexSessionSummary[]
}
