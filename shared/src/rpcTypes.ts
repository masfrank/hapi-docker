export type ImportableSessionAgent = 'codex' | 'claude'

export type ImportableSessionSummary = {
    agent: ImportableSessionAgent
    externalSessionId: string
    cwd: string | null
    timestamp: number | null
    transcriptPath: string
    previewTitle: string | null
    previewPrompt: string | null
}

export type ImportableCodexSessionSummary = ImportableSessionSummary

export type RpcListImportableSessionsRequest = {
    agent: ImportableSessionAgent
}

export type RpcListImportableSessionsResponse = {
    sessions: ImportableSessionSummary[]
}
