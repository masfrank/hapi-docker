import { describe, expect, it } from 'vitest';
import { isInternalEventJson } from './internalEventFilter';

describe('isInternalEventJson', () => {
    it('returns false for non-JSON text', () => {
        expect(isInternalEventJson('Hello world')).toBe(false);
    });

    it('returns false for JSON without a type field', () => {
        expect(isInternalEventJson('{"foo":"bar"}')).toBe(false);
    });

    it('returns true for { type: "output", ... }', () => {
        const json = JSON.stringify({
            type: 'output',
            data: {
                parentUuid: 'abc',
                isSidechain: false,
                userType: 'external',
                sessionId: '123',
            },
        });
        expect(isInternalEventJson(json)).toBe(true);
    });

    it('returns true for { type: "event", ... }', () => {
        const json = JSON.stringify({ type: 'event', data: { type: 'ready' } });
        expect(isInternalEventJson(json)).toBe(true);
    });

    it('returns true for { type: "queue-operation", ... }', () => {
        const json = JSON.stringify({ type: 'queue-operation', op: 'enqueue' });
        expect(isInternalEventJson(json)).toBe(true);
    });

    it('returns false for unknown types', () => {
        expect(isInternalEventJson('{"type":"assistant"}')).toBe(false);
        expect(isInternalEventJson('{"type":"user"}')).toBe(false);
    });

    it('returns false for invalid JSON starting with {', () => {
        expect(isInternalEventJson('{not valid json')).toBe(false);
    });
});
