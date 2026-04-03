import type { NormalizedSubagentLifecycleStatus, NormalizedSubagentMeta } from './types';

export function createSpawnMeta(input: {
    sidechainKey: string;
    prompt?: string;
}): NormalizedSubagentMeta {
    return {
        kind: 'spawn',
        sidechainKey: input.sidechainKey,
        ...(input.prompt ? { prompt: input.prompt } : {})
    };
}

export function createStatusMeta(input: {
    sidechainKey: string;
    status: NormalizedSubagentLifecycleStatus;
    agentId?: string;
    nickname?: string;
}): NormalizedSubagentMeta {
    return {
        kind: 'status',
        sidechainKey: input.sidechainKey,
        status: input.status,
        ...(input.agentId ? { agentId: input.agentId } : {}),
        ...(input.nickname ? { nickname: input.nickname } : {})
    };
}
