import { isPermissionModeAllowedForFlavor, isObject } from '@hapi/protocol'
import { PermissionModeSchema } from '@hapi/protocol/schemas'
import type { TeamState } from '@hapi/protocol/types'
import { Hono } from 'hono'
import { z } from 'zod'
import type { SyncEngine } from '../../sync/syncEngine'
import type { WebAppEnv } from '../middleware/auth'
import { requireSessionFromParam, requireSyncEngine } from './guards'

const decisionSchema = z.enum(['approved', 'approved_for_session', 'denied', 'abort'])

// Flat format: Record<string, string[]> (AskUserQuestion)
// Nested format: Record<string, { answers: string[] }> (request_user_input)
const answersSchema = z.union([
    z.record(z.string(), z.array(z.string())),
    z.record(z.string(), z.object({ answers: z.array(z.string()) }))
])

const approveBodySchema = z.object({
    mode: PermissionModeSchema.optional(),
    allowTools: z.array(z.string()).optional(),
    decision: decisionSchema.optional(),
    answers: answersSchema.optional()
})

const denyBodySchema = z.object({
    decision: decisionSchema.optional()
})

/**
 * Update the teamState.pendingPermissions status for a given requestId (toolUseId).
 * This keeps the TeamPanel UI in sync after API-based approval/denial.
 */
function updateTeamPermissionStatus(
    engine: SyncEngine,
    sessionId: string,
    session: { teamState?: TeamState | null; namespace: string },
    requestId: string,
    status: 'approved' | 'denied'
): void {
    const teamState = session.teamState as TeamState | null | undefined
    if (!teamState?.pendingPermissions?.length) return

    const updated = teamState.pendingPermissions.map(p =>
        (p.requestId === requestId || p.toolUseId === requestId)
            ? { ...p, status: status as 'approved' | 'denied' }
            : p
    )

    // Only persist if something actually changed
    if (updated.every((p, i) => p === teamState.pendingPermissions![i])) return

    const newTeamState = { ...teamState, pendingPermissions: updated, updatedAt: Date.now() }
    engine.updateSessionTeamState(sessionId, newTeamState, session.namespace)
}

export function createPermissionsRoutes(getSyncEngine: () => SyncEngine | null): Hono<WebAppEnv> {
    const app = new Hono<WebAppEnv>()

    app.post('/sessions/:id/permissions/:requestId/approve', async (c) => {
        const engine = requireSyncEngine(c, getSyncEngine)
        if (engine instanceof Response) {
            return engine
        }

        const requestId = c.req.param('requestId')

        const sessionResult = requireSessionFromParam(c, engine, { requireActive: true })
        if (sessionResult instanceof Response) {
            return sessionResult
        }
        const { sessionId, session } = sessionResult

        const json = await c.req.json().catch(() => null)
        const parsed = approveBodySchema.safeParse(json ?? {})
        if (!parsed.success) {
            return c.json({ error: 'Invalid body' }, 400)
        }

        const requests = session.agentState?.requests ?? null

        // Resolve the correct agentState.requests key.
        // The requestId from the web UI may be a teammate message ID ("perm-...") or
        // SDK tool_use_id ("toolu_...") that doesn't match the agentState.requests key
        // ("subagent_..."). Try to resolve via teamState.pendingPermissions.toolUseId.
        let agentRequestId = requestId
        if (!(requests && requests[agentRequestId])) {
            const teamState = session.teamState as TeamState | null | undefined
            const teamPerm = teamState?.pendingPermissions?.find(
                p => p.requestId === requestId || p.toolUseId === requestId
            )
            if (teamPerm) {
                // toolUseId is updated by syncAgentPermissionsToTeamState to point
                // to the agentState.requests key
                if (teamPerm.toolUseId && requests?.[teamPerm.toolUseId]) {
                    agentRequestId = teamPerm.toolUseId
                } else if (teamPerm.requestId && requests?.[teamPerm.requestId]) {
                    agentRequestId = teamPerm.requestId
                } else {
                    // Last resort: find by tool name match in agentState.requests
                    for (const [key, req] of Object.entries(requests ?? {})) {
                        if (isObject(req) && req.tool === teamPerm.toolName) {
                            agentRequestId = key
                            break
                        }
                    }
                }
            }
        }

        if (requests && requests[agentRequestId]) {
            // RPC path: send approval directly to the CLI agent via RPC
            const mode = parsed.data.mode
            if (mode !== undefined) {
                const flavor = session.metadata?.flavor ?? 'claude'
                if (!isPermissionModeAllowedForFlavor(mode, flavor)) {
                    return c.json({ error: 'Invalid permission mode for session flavor' }, 400)
                }
            }
            const allowTools = parsed.data.allowTools
            const decision = parsed.data.decision
            const answers = parsed.data.answers
            await engine.approvePermission(sessionId, agentRequestId, mode, allowTools, decision, answers)
            updateTeamPermissionStatus(engine, sessionId, session, requestId, 'approved')
            return c.json({ ok: true })
        }

        // Fallback: permission not found in agentState.requests at all.
        // Send approval as a user message so the parent agent can relay it.
        const teamState = session.teamState as TeamState | null | undefined
        const teamPerm = teamState?.pendingPermissions?.find(
            p => p.requestId === requestId || p.toolUseId === requestId
        )
        if (teamPerm) {
            const approvalText = `Approve ${teamPerm.memberName}'s permission request to use ${teamPerm.toolName}. Request ID: ${teamPerm.requestId}`
            await engine.sendMessage(sessionId, { text: approvalText, sentFrom: 'webapp' })
            updateTeamPermissionStatus(engine, sessionId, session, requestId, 'approved')
            return c.json({ ok: true, via: 'teammate-message' })
        }

        return c.json({ error: 'Request not found' }, 404)
    })

    app.post('/sessions/:id/permissions/:requestId/deny', async (c) => {
        const engine = requireSyncEngine(c, getSyncEngine)
        if (engine instanceof Response) {
            return engine
        }

        const requestId = c.req.param('requestId')

        const sessionResult = requireSessionFromParam(c, engine, { requireActive: true })
        if (sessionResult instanceof Response) {
            return sessionResult
        }
        const { sessionId, session } = sessionResult

        const json = await c.req.json().catch(() => null)
        const parsed = denyBodySchema.safeParse(json ?? {})
        if (!parsed.success) {
            return c.json({ error: 'Invalid body' }, 400)
        }

        const requests = session.agentState?.requests ?? null

        // Resolve correct agentState.requests key (same logic as approve)
        let agentRequestId = requestId
        if (!(requests && requests[agentRequestId])) {
            const teamState = session.teamState as TeamState | null | undefined
            const teamPerm = teamState?.pendingPermissions?.find(
                p => p.requestId === requestId || p.toolUseId === requestId
            )
            if (teamPerm) {
                if (teamPerm.toolUseId && requests?.[teamPerm.toolUseId]) {
                    agentRequestId = teamPerm.toolUseId
                } else if (teamPerm.requestId && requests?.[teamPerm.requestId]) {
                    agentRequestId = teamPerm.requestId
                } else {
                    for (const [key, req] of Object.entries(requests ?? {})) {
                        if (isObject(req) && req.tool === teamPerm.toolName) {
                            agentRequestId = key
                            break
                        }
                    }
                }
            }
        }

        if (requests && requests[agentRequestId]) {
            await engine.denyPermission(sessionId, agentRequestId, parsed.data.decision)
            updateTeamPermissionStatus(engine, sessionId, session, requestId, 'denied')
            return c.json({ ok: true })
        }

        // Fallback: send denial as a user message
        const teamState = session.teamState as TeamState | null | undefined
        const teamPerm = teamState?.pendingPermissions?.find(
            p => p.requestId === requestId || p.toolUseId === requestId
        )
        if (teamPerm) {
            const denyText = `Deny ${teamPerm.memberName}'s permission request to use ${teamPerm.toolName}. Request ID: ${teamPerm.requestId}`
            await engine.sendMessage(sessionId, { text: denyText, sentFrom: 'webapp' })
            updateTeamPermissionStatus(engine, sessionId, session, requestId, 'denied')
            return c.json({ ok: true, via: 'teammate-message' })
        }

        return c.json({ error: 'Request not found' }, 404)
    })

    return app
}
