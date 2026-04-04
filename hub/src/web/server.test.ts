import { describe, expect, it } from 'bun:test'
import { resolveMaxRequestBodySize } from './server'

describe('resolveMaxRequestBodySize', () => {
    it('does not inherit the socket handler 1MB limit for normal HTTP routes', () => {
        expect(resolveMaxRequestBodySize(1_000_000)).toBe(100 * 1024 * 1024)
    })

    it('preserves larger socket handler limits when they already exceed the upload floor', () => {
        expect(resolveMaxRequestBodySize(150 * 1024 * 1024)).toBe(150 * 1024 * 1024)
    })
})
