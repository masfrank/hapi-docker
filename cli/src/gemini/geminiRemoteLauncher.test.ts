import { describe, it, expect, vi, afterEach } from 'vitest';
import { geminiRemoteLauncher } from './geminiRemoteLauncher';

vi.mock('./utils/geminiBackend');
vi.mock('./utils/config');
vi.mock('./utils/sessionScanner');
vi.mock('@/codex/utils/buildHapiMcpBridge');
vi.mock('@/ui/ink/GeminiDisplay');
vi.mock('./utils/permissionHandler', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GeminiPermissionHandler: vi.fn().mockImplementation(function(this: any) {
        this.cancelAll = vi.fn().mockResolvedValue(undefined);
    }),
}));

afterEach(() => {
    vi.clearAllMocks();
});

function makeMockSession(opts: { sessionId: string | null } = { sessionId: null }) {
    return {
        sessionId: opts.sessionId,
        path: '/test/path',
        logPath: '/test/log',
        historyReplayed: false,
        queue: {
            waitForMessagesAndGetAsString: vi.fn().mockResolvedValue(null),
            size: vi.fn().mockReturnValue(0),
            reset: vi.fn(),
        },
        client: {
            rpcHandlerManager: { registerHandler: vi.fn() },
            sendSessionEvent: vi.fn(),
        },
        sendSessionEvent: vi.fn(),
        onSessionFound: vi.fn(),
        onThinkingChange: vi.fn(),
        getPermissionMode: vi.fn().mockReturnValue('auto'),
    };
}

async function setupMocks() {
    const { createGeminiBackend } = await import('./utils/geminiBackend');
    const { buildHapiMcpBridge } = await import('@/codex/utils/buildHapiMcpBridge');
    const { resolveGeminiRuntimeConfig } = await import('./utils/config');

    const mockBackend = {
        onStderrError: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn(),
        newSession: vi.fn().mockResolvedValue('new-acp-session-id'),
        prompt: vi.fn().mockResolvedValue(undefined),
        cancelPrompt: vi.fn(),
        disconnect: vi.fn().mockResolvedValue(undefined),
        processingMessage: false,
    };

    vi.mocked(createGeminiBackend).mockReturnValue(mockBackend as never);
    vi.mocked(buildHapiMcpBridge).mockResolvedValue({ server: { stop: vi.fn() }, mcpServers: {} } as never);
    vi.mocked(resolveGeminiRuntimeConfig).mockReturnValue({ model: 'gemini-2.5-pro', token: undefined } as never);

    return mockBackend;
}

describe('geminiRemoteLauncher', () => {
    describe('history replay on resume', () => {
        it('does not replay history when loadSession fails (model has no prior context)', async () => {
            const mockBackend = await setupMocks();
            const { findGeminiTranscriptPath } = await import('./utils/sessionScanner');

            mockBackend.loadSession.mockRejectedValue(new Error('session not found'));

            const session = makeMockSession({ sessionId: 'existing-session-id' });
            await geminiRemoteLauncher(session as never, {});

            expect(findGeminiTranscriptPath).not.toHaveBeenCalled();
        });

        it('replays history when loadSession succeeds', async () => {
            const mockBackend = await setupMocks();
            const { findGeminiTranscriptPath } = await import('./utils/sessionScanner');

            mockBackend.loadSession.mockResolvedValue('existing-session-id');
            vi.mocked(findGeminiTranscriptPath).mockResolvedValue(null);

            const session = makeMockSession({ sessionId: 'existing-session-id' });
            await geminiRemoteLauncher(session as never, {});

            expect(findGeminiTranscriptPath).toHaveBeenCalledWith('existing-session-id');
        });

        it('does not replay history when there is no sessionId', async () => {
            await setupMocks();
            const { findGeminiTranscriptPath } = await import('./utils/sessionScanner');

            const session = makeMockSession({ sessionId: null });
            await geminiRemoteLauncher(session as never, {});

            expect(findGeminiTranscriptPath).not.toHaveBeenCalled();
        });
    });
});
