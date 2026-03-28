import type { PiPermissionMode, PiThinkingLevel } from '@hapi/protocol/types'

export type { PiPermissionMode, PiThinkingLevel }

export type PiEnhancedMode = {
    permissionMode?: PiPermissionMode
    model?: string
    piThinkingLevel?: PiThinkingLevel
}
