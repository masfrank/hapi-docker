import '@testing-library/jest-dom/vitest'

function createMemoryStorage(): Storage {
    const store = new Map<string, string>()

    return {
        get length() {
            return store.size
        },
        clear() {
            store.clear()
        },
        getItem(key: string) {
            return store.get(key) ?? null
        },
        key(index: number) {
            return Array.from(store.keys())[index] ?? null
        },
        removeItem(key: string) {
            store.delete(key)
        },
        setItem(key: string, value: string) {
            store.set(key, value)
        }
    }
}

function ensureStorage(name: 'localStorage' | 'sessionStorage') {
    const current = globalThis[name]
    const looksValid = current
        && typeof current.getItem === 'function'
        && typeof current.setItem === 'function'
        && typeof current.removeItem === 'function'
        && typeof current.clear === 'function'

    if (looksValid) {
        return
    }

    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, name, {
        value: storage,
        configurable: true
    })
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, name, {
            value: storage,
            configurable: true
        })
    }
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')
