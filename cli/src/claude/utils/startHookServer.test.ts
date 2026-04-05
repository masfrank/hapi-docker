import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import { createHookRequestHandler, type SessionHookData } from './startHookServer'

class MockRequest extends Readable {
    headers: Record<string, string | string[] | undefined>
    method: string
    url: string
    private sent = false

    constructor(opts: {
        body: string
        path?: string
        token?: string
    }) {
        super()
        this.method = 'POST'
        this.url = opts.path ?? '/hook/session-start'
        this.headers = {
            'content-type': 'application/json',
            'content-length': `${Buffer.byteLength(opts.body)}`
        }
        if (opts.token) {
            this.headers['x-hapi-hook-token'] = opts.token
        }
        this.body = opts.body
    }

    private readonly body: string

    _read(): void {
        if (this.sent) {
            this.push(null)
            return
        }
        this.sent = true
        this.push(Buffer.from(this.body, 'utf-8'))
        this.push(null)
    }
}

class MockResponse {
    statusCode: number | undefined
    headersSent = false
    writableEnded = false
    body = ''

    writeHead(statusCode: number): this {
        this.statusCode = statusCode
        this.headersSent = true
        return this
    }

    end(body?: string): this {
        if (body) {
            this.body += body
        }
        this.writableEnded = true
        return this
    }
}

const sendHookRequest = async (
    handler: ReturnType<typeof createHookRequestHandler>,
    body: string,
    token?: string
): Promise<{ statusCode?: number; body: string }> => {
    const req = new MockRequest({ body, token })
    const res = new MockResponse()

    await handler(req as never, res as never)

    return {
        statusCode: res.statusCode,
        body: res.body
    }
}

describe('startHookServer', () => {
    it('forwards session hook payload to callback', async () => {
        let received: { sessionId?: string; data?: SessionHookData } = {}
        const token = 'test-hook-token'
        const handler = createHookRequestHandler({
            token,
            onSessionHook: (sessionId, data) => {
                received = { sessionId, data }
            }
        })

        const body = JSON.stringify({ session_id: 'session-123', extra: 'ok' })
        const response = await sendHookRequest(handler, body, token)

        expect(response.statusCode).toBe(200)
        expect(received.sessionId).toBe('session-123')
        expect(received.data?.session_id).toBe('session-123')
    })

    it('returns 400 for invalid JSON payloads', async () => {
        let hookCalled = false
        const token = 'test-hook-token'
        const handler = createHookRequestHandler({
            token,
            onSessionHook: () => {
                hookCalled = true
            }
        })

        const response = await sendHookRequest(handler, '{"session_id":', token)

        expect(response.statusCode).toBe(400)
        expect(response.body).toBe('invalid json')
        expect(hookCalled).toBe(false)
    })

    it('returns 422 when session_id is missing', async () => {
        let hookCalled = false
        const token = 'test-hook-token'
        const handler = createHookRequestHandler({
            token,
            onSessionHook: () => {
                hookCalled = true
            }
        })

        const body = JSON.stringify({ extra: 'ok' })
        const response = await sendHookRequest(handler, body, token)

        expect(response.statusCode).toBe(422)
        expect(response.body).toBe('missing session_id')
        expect(hookCalled).toBe(false)
    })

    it('returns 401 when hook token is missing', async () => {
        let hookCalled = false
        const token = 'test-hook-token'
        const handler = createHookRequestHandler({
            token,
            onSessionHook: () => {
                hookCalled = true
            }
        })

        const body = JSON.stringify({ session_id: 'session-123' })
        const response = await sendHookRequest(handler, body)

        expect(response.statusCode).toBe(401)
        expect(response.body).toBe('unauthorized')
        expect(hookCalled).toBe(false)
    })
})
