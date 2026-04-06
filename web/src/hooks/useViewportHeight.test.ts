import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useViewportHeight } from './useViewportHeight'

// Mock isTelegramApp — default to false (non-Telegram)
vi.mock('@/hooks/useTelegram', () => ({
    isTelegramApp: vi.fn(() => false),
}))

function installFakeViewport(height: number) {
    const listeners = new Map<string, Set<() => void>>()
    const viewport = {
        height,
        addEventListener: vi.fn((event: string, handler: () => void) => {
            if (!listeners.has(event)) listeners.set(event, new Set())
            listeners.get(event)!.add(handler)
        }),
        removeEventListener: vi.fn((event: string, handler: () => void) => {
            listeners.get(event)?.delete(handler)
        }),
        fireResize(newHeight: number) {
            viewport.height = newHeight
            for (const handler of listeners.get('resize') ?? []) {
                handler()
            }
        },
    }
    Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: viewport,
    })
    return viewport
}

describe('useViewportHeight', () => {
    const root = document.documentElement

    beforeEach(() => {
        root.style.removeProperty('--app-viewport-height')
        // Set a stable window.innerHeight for tests
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    })

    afterEach(() => {
        cleanup()
        root.style.removeProperty('--app-viewport-height')
    })

    it('registers a resize listener on visualViewport', () => {
        const viewport = installFakeViewport(800)
        renderHook(() => useViewportHeight())

        expect(viewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('sets --app-viewport-height when keyboard opens', () => {
        const viewport = installFakeViewport(800)
        renderHook(() => useViewportHeight())

        // Simulate keyboard open — viewport shrinks
        viewport.fireResize(400)

        expect(root.style.getPropertyValue('--app-viewport-height')).toBe('400px')
    })

    it('removes --app-viewport-height when keyboard closes', () => {
        const viewport = installFakeViewport(800)
        renderHook(() => useViewportHeight())

        viewport.fireResize(400)
        expect(root.style.getPropertyValue('--app-viewport-height')).toBe('400px')

        viewport.fireResize(800)
        expect(root.style.getPropertyValue('--app-viewport-height')).toBe('')
    })

    it('ignores sub-pixel differences (threshold of 1px)', () => {
        const viewport = installFakeViewport(800)
        renderHook(() => useViewportHeight())

        viewport.fireResize(799.5)
        expect(root.style.getPropertyValue('--app-viewport-height')).toBe('')
    })

    it('cleans up listener and CSS variable on unmount', () => {
        const viewport = installFakeViewport(800)
        const { unmount } = renderHook(() => useViewportHeight())

        viewport.fireResize(400)
        expect(root.style.getPropertyValue('--app-viewport-height')).toBe('400px')

        unmount()

        expect(viewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
        expect(root.style.getPropertyValue('--app-viewport-height')).toBe('')
    })

    it('skips in Telegram environment', async () => {
        const { isTelegramApp } = await import('@/hooks/useTelegram')
        vi.mocked(isTelegramApp).mockReturnValue(true)

        const viewport = installFakeViewport(800)
        renderHook(() => useViewportHeight())

        expect(viewport.addEventListener).not.toHaveBeenCalled()

        vi.mocked(isTelegramApp).mockReturnValue(false)
    })
})
