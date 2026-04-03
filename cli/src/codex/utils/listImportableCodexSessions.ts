import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import type { ImportableCodexSessionSummary } from '@hapi/protocol/rpcTypes';

export type ListImportableCodexSessionsOptions = {
    rootDir?: string;
};

export async function listImportableCodexSessions(
    opts: ListImportableCodexSessionsOptions = {}
): Promise<{ sessions: ImportableCodexSessionSummary[] }> {
    const sessionsRoot = opts.rootDir?.trim() ? opts.rootDir : getCodexSessionsRoot();
    const transcriptPaths = (await collectJsonlFiles(sessionsRoot)).sort((a, b) => a.localeCompare(b));
    const summaries = (await Promise.all(transcriptPaths.map(async (transcriptPath) => scanCodexTranscript(transcriptPath))))
        .filter((summary): summary is ImportableCodexSessionSummary => summary !== null);

    summaries.sort(compareImportableCodexSessions);

    return { sessions: summaries };
}

async function scanCodexTranscript(transcriptPath: string): Promise<ImportableCodexSessionSummary | null> {
    let content: string;
    try {
        content = await readFile(transcriptPath, 'utf-8');
    } catch {
        return null;
    }

    const lines = content.split(/\r?\n/);
    const records = lines
        .map((line, lineIndex) => ({
            lineIndex,
            record: parseJsonLine(line)
        }))
        .filter((entry): entry is { lineIndex: number; record: Record<string, unknown> } => entry.record !== null);

    const sessionMetaEntries = records.filter((entry) => isSessionMetaRecord(entry.record));
    if (sessionMetaEntries.length === 0) {
        return null;
    }

    const sessionMetaEntry = [...sessionMetaEntries].reverse().find((entry) => {
        const payload = getRecord(entry.record.payload);
        return getString(payload?.id) !== null;
    });
    if (!sessionMetaEntry) {
        return null;
    }

    const payload = getRecord(sessionMetaEntry.record.payload);
    const externalSessionId = getString(payload?.id);
    if (!externalSessionId) {
        return null;
    }

    if (isChildCodexSession(payload)) {
        return null;
    }

    const cwd = getString(payload?.cwd);
    const timestamp = parseTimestamp(payload?.timestamp);

    let latestRootTitleChange: string | null = null;
    let firstRootPrompt: string | null = null;

    for (const entry of records) {
        if (entry.lineIndex <= sessionMetaEntry.lineIndex) {
            continue;
        }

        if (isRootTitleChangeRecord(entry.record)) {
            const title = extractTitleFromRecord(entry.record);
            if (title) {
                latestRootTitleChange = title;
            }
            continue;
        }

        const prompt = extractRootPromptFromRecord(entry.record);
        if (prompt && !firstRootPrompt) {
            firstRootPrompt = prompt;
        }
    }

    const previewPrompt = firstRootPrompt;
    const previewTitle = latestRootTitleChange
        ?? firstRootPrompt
        ?? deriveCwdPreview(cwd)
        ?? shortExternalSessionId(externalSessionId);

    return {
        agent: 'codex',
        externalSessionId,
        cwd,
        timestamp,
        transcriptPath,
        previewTitle,
        previewPrompt
    };
}

function getCodexSessionsRoot(): string {
    const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
    return join(codexHome, 'sessions');
}

async function collectJsonlFiles(root: string): Promise<string[]> {
    try {
        const entries = await readdir(root, { withFileTypes: true });
        const files: string[] = [];

        for (const entry of entries) {
            const fullPath = join(root, entry.name);
            if (entry.isDirectory()) {
                files.push(...await collectJsonlFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
                files.push(fullPath);
            }
        }

        return files;
    } catch {
        return [];
    }
}

function parseJsonLine(line: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(line) as unknown;
        return getRecord(parsed);
    } catch {
        return null;
    }
}

function isSessionMetaRecord(value: Record<string, unknown> | null): value is Record<string, unknown> {
    return getString(value?.type) === 'session_meta' && getRecord(value?.payload) !== null;
}

function isChildCodexSession(payload: Record<string, unknown> | null): boolean {
    return hasNestedValue(payload, ['source', 'subagent', 'thread_spawn', 'parent_thread_id']);
}

function isRootTitleChangeRecord(record: Record<string, unknown>): boolean {
    if (isSidechainRecord(record)) {
        return false;
    }

    if (getString(record.type) === 'session_title_change') {
        return true;
    }

    const payload = getRecord(record.payload);
    if (!payload) {
        return false;
    }

    const payloadType = getString(payload.type);
    if (payloadType === 'session_title_change') {
        return true;
    }

    if (payloadType !== 'function_call' && payloadType !== 'mcpToolCall') {
        return false;
    }

    const toolName = getString(payload.name ?? payload.tool);
    return typeof toolName === 'string' && toolName.endsWith('change_title');
}

function extractTitleFromRecord(record: Record<string, unknown>): string | null {
    const payload = getRecord(record.payload);
    if (!payload) {
        return extractTextValue(record.title);
    }

    const payloadType = getString(payload.type);
    if (payloadType === 'session_title_change') {
        return extractTextValue(payload.title);
    }

    if (payloadType === 'function_call' || payloadType === 'mcpToolCall') {
        const argumentsValue = payload.arguments ?? payload.arguments_json ?? payload.input;
        const argumentsValueRecord = parseMaybeJson(argumentsValue);
        const title = extractTextValue(argumentsValueRecord?.title ?? argumentsValueRecord);
        if (title) {
            return title;
        }
    }

    return extractTextValue(payload.title) ?? extractTextValue(record.title);
}

function extractRootPromptFromRecord(record: Record<string, unknown>): string | null {
    if (isSidechainRecord(record)) {
        return null;
    }

    const type = getString(record.type);
    const payload = getRecord(record.payload);
    const promptSources = [
        payload?.message,
        payload?.text,
        payload?.content,
        payload?.input,
        payload?.body,
        record.message,
        record.text,
        record.content,
        record.input,
        record.body
    ];

    if (type === 'event_msg' || type === 'event') {
        const eventType = getString(payload?.type);
        if (eventType === 'user_message' || eventType === 'userMessage') {
            return extractTextValue(promptSources);
        }
    }

    if (type === 'user_message' || type === 'userMessage') {
        return extractTextValue(promptSources);
    }

    if (type === 'response_item' || type === 'item') {
        const itemType = getString(payload?.type);
        if (itemType === 'user_message' || itemType === 'userMessage') {
            return extractTextValue(promptSources);
        }
    }

    return null;
}

function isSidechainRecord(record: Record<string, unknown>): boolean {
    if (record.hapiSidechain && typeof record.hapiSidechain === 'object') {
        return true;
    }

    const payload = getRecord(record.payload);
    if (!payload) {
        return false;
    }

    if (payload.parent_tool_call_id || payload.parentToolCallId || payload.isSidechain) {
        return true;
    }

    return hasNestedValue(payload, ['hapiSidechain']);
}

function parseMaybeJson(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'object') {
        return getRecord(value);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }
        try {
            return getRecord(JSON.parse(trimmed));
        } catch {
            return null;
        }
    }

    return null;
}

function extractTextValue(value: unknown): string | null {
    const chunks = extractTextChunks(value);
    if (chunks.length === 0) {
        return null;
    }

    return normalizePreviewText(chunks.join(' '));
}

function extractTextChunks(value: unknown): string[] {
    if (typeof value === 'string') {
        const normalized = normalizePreviewText(value);
        return normalized ? [normalized] : [];
    }

    if (Array.isArray(value)) {
        const chunks: string[] = [];
        for (const entry of value) {
            chunks.push(...extractTextChunks(entry));
        }
        return chunks;
    }

    const record = getRecord(value);
    if (!record) {
        return [];
    }

    const directKeys = ['title', 'message', 'text', 'content', 'input', 'body'] as const;

    for (const key of directKeys) {
        const entryValue = record[key];
        if (entryValue === undefined || entryValue === null) {
            continue;
        }
        const chunks = extractTextChunks(entryValue);
        if (chunks.length > 0) {
            return chunks;
        }
    }

    return [];
}

function parseTimestamp(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

function deriveCwdPreview(cwd: string | null): string | null {
    if (!cwd) {
        return null;
    }

    const trimmed = cwd.trim();
    if (!trimmed) {
        return null;
    }

    const segment = basename(trimmed);
    return segment.length > 0 ? normalizePreviewText(segment) : null;
}

function shortExternalSessionId(externalSessionId: string): string {
    return externalSessionId.length > 8 ? externalSessionId.slice(0, 8) : externalSessionId;
}

function normalizePreviewText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function compareImportableCodexSessions(
    left: ImportableCodexSessionSummary,
    right: ImportableCodexSessionSummary
): number {
    const leftTimestamp = left.timestamp ?? Number.NEGATIVE_INFINITY;
    const rightTimestamp = right.timestamp ?? Number.NEGATIVE_INFINITY;

    if (leftTimestamp !== rightTimestamp) {
        return rightTimestamp - leftTimestamp;
    }

    return left.transcriptPath.localeCompare(right.transcriptPath);
}

function getRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    return value as Record<string, unknown>;
}

function getString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function hasNestedValue(value: Record<string, unknown> | null, path: string[]): boolean {
    let current: unknown = value;

    for (const segment of path) {
        if (!current || typeof current !== 'object') {
            return false;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return current !== undefined && current !== null && (!(typeof current === 'string') || current.length > 0);
}
