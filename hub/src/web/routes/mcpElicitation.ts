import { McpElicitationResponseSchema } from '@hapi/protocol/schemas'
import { Hono } from 'hono'
import type { SyncEngine } from '../../sync/syncEngine'
import type { WebAppEnv } from '../middleware/auth'
import { requireSessionFromParam, requireSyncEngine } from './guards'

export function createMcpElicitationRoutes(getSyncEngine: () => SyncEngine | null): Hono<WebAppEnv> {
    const app = new Hono<WebAppEnv>()

    app.post('/sessions/:id/mcp-elicitation/:requestId/respond', async (c) => {
        const engine = requireSyncEngine(c, getSyncEngine)
        if (engine instanceof Response) {
            return engine
        }

        const sessionResult = requireSessionFromParam(c, engine, { requireActive: true })
        if (sessionResult instanceof Response) {
            return sessionResult
        }

        const requestId = c.req.param('requestId')
        const json = await c.req.json().catch(() => null)
        const parsed = McpElicitationResponseSchema.omit({ id: true }).safeParse(json ?? {})
        if (!parsed.success) {
            return c.json({ error: 'Invalid body' }, 400)
        }

        await engine.respondToMcpElicitation(
            sessionResult.sessionId,
            requestId,
            parsed.data.action,
            parsed.data.content ?? null
        )

        return c.json({ ok: true })
    })

    return app
}
