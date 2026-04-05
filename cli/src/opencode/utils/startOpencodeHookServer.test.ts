import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import { createOpencodeHookRequestHandler } from './startOpencodeHookServer'

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
        this.url = opts.path ?? '/hook/opencode'
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
    handler: ReturnType<typeof createOpencodeHookRequestHandler>,
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

describe('startOpencodeHookServer', () => {
    it('forwards hook payload to callback', async () => {
        let received: { event?: string; payload?: unknown; sessionId?: string } = {}
        const token = 'test-hook-token'
        const handler = createOpencodeHookRequestHandler({
            token,
            onEvent: (event) => {
                received = event
            }
        })

        const body = JSON.stringify({
            event: 'message.updated',
            payload: { message: 'ok' },
            sessionId: 'session-123'
        })
        const response = await sendHookRequest(handler, body, token)

        expect(response.statusCode).toBe(200)
        expect(received.event).toBe('message.updated')
        expect(received.sessionId).toBe('session-123')
        expect(received.payload).toEqual({ message: 'ok' })
    })

    it('returns 400 for invalid JSON payloads', async () => {
        let hookCalled = false
        const token = 'test-hook-token'
        const handler = createOpencodeHookRequestHandler({
            token,
            onEvent: () => {
                hookCalled = true
            }
        })

        const response = await sendHookRequest(handler, '{"event":', token)

        expect(response.statusCode).toBe(400)
        expect(response.body).toBe('invalid json')
        expect(hookCalled).toBe(false)
    })

    it('returns 422 when event is missing', async () => {
        let hookCalled = false
        const token = 'test-hook-token'
        const handler = createOpencodeHookRequestHandler({
            token,
            onEvent: () => {
                hookCalled = true
            }
        })

        const body = JSON.stringify({ payload: { ok: true } })
        const response = await sendHookRequest(handler, body, token)

        expect(response.statusCode).toBe(422)
        expect(response.body).toBe('missing event')
        expect(hookCalled).toBe(false)
    })

    it('returns 401 when hook token is missing', async () => {
        let hookCalled = false
        const token = 'test-hook-token'
        const handler = createOpencodeHookRequestHandler({
            token,
            onEvent: () => {
                hookCalled = true
            }
        })

        const body = JSON.stringify({ event: 'message.updated', payload: { ok: true } })
        const response = await sendHookRequest(handler, body)

        expect(response.statusCode).toBe(401)
        expect(response.body).toBe('unauthorized')
        expect(hookCalled).toBe(false)
    })
})
