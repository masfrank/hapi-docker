/**
 * Detect internal event JSON that leaks into agent text output.
 *
 * Claude's SDK occasionally emits internal control messages (session metadata,
 * rate-limit envelopes, etc.) as text chunks. These are not meant for display.
 *
 * This function catches the ones that slip past `parseRateLimitText`:
 *   - { type: "output", data: { parentUuid, sessionId, ... } }
 *   - Any other JSON object whose `type` is a known internal envelope type.
 *
 * Only called for text that starts with '{', so the fast-path for normal
 * prose has zero overhead.
 */
const INTERNAL_TYPES = new Set([
    'output',
    'event',
    'queue-operation',
]);

export function isInternalEventJson(text: string): boolean {
    if (text[0] !== '{') return false;

    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return false;
    }
    if (typeof parsed !== 'object' || parsed === null) return false;

    const record = parsed as Record<string, unknown>;
    if (typeof record.type === 'string' && INTERNAL_TYPES.has(record.type)) {
        return true;
    }

    return false;
}
