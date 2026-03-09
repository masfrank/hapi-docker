import { useState } from 'react'
import type { TeamState, TeamMember, TeamTask, TeamMessage } from '@hapi/protocol/types'

function memberStatusColor(status?: string): string {
    switch (status) {
        case 'active': return 'bg-emerald-500'
        case 'idle': return 'bg-amber-400'
        case 'completed': return 'bg-blue-500'
        case 'error': return 'bg-red-500'
        case 'shutdown': return 'bg-gray-400'
        default: return 'bg-gray-400'
    }
}

function memberStatusLabel(status?: string): string {
    switch (status) {
        case 'active': return 'Running'
        case 'idle': return 'Idle'
        case 'completed': return 'Done'
        case 'error': return 'Error'
        case 'shutdown': return 'Stopped'
        default: return 'Unknown'
    }
}

function taskStatusIcon(status?: string): string {
    switch (status) {
        case 'completed': return '\u2713'
        case 'in_progress': return '\u25CF'
        case 'blocked': return '\u26A0'
        default: return '\u25CB'
    }
}

function taskStatusClass(status?: string): string {
    switch (status) {
        case 'completed': return 'text-emerald-500'
        case 'in_progress': return 'text-[var(--app-link)]'
        case 'blocked': return 'text-red-500'
        default: return 'text-[var(--app-hint)]'
    }
}

function MemberCard({ member }: { member: TeamMember }) {
    return (
        <div className="flex items-center gap-2 rounded-md bg-[var(--app-subtle-bg)] px-2.5 py-1.5">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${memberStatusColor(member.status)}`} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-[var(--app-fg)]">
                        {member.name}
                    </span>
                    {member.agentType && (
                        <span className="shrink-0 rounded bg-[var(--app-border)] px-1 py-px text-[10px] text-[var(--app-hint)]">
                            {member.agentType}
                        </span>
                    )}
                    {member.isolation === 'worktree' && (
                        <span className="shrink-0 rounded bg-[var(--app-badge-warning-bg)] px-1 py-px text-[10px] text-[var(--app-badge-warning-text)]">
                            worktree
                        </span>
                    )}
                    {member.runInBackground && (
                        <span className="shrink-0 rounded bg-[var(--app-badge-success-bg)] px-1 py-px text-[10px] text-[var(--app-badge-success-text)]">
                            bg
                        </span>
                    )}
                </div>
                {member.description && (
                    <div className="mt-0.5 truncate text-[10px] leading-tight text-[var(--app-hint)]">
                        {member.description}
                    </div>
                )}
            </div>
            <span className="shrink-0 text-[10px] text-[var(--app-hint)]">
                {memberStatusLabel(member.status)}
            </span>
        </div>
    )
}

function TaskItem({ task }: { task: TeamTask }) {
    return (
        <div className="flex items-start gap-1.5 text-xs">
            <span className={`mt-px shrink-0 ${taskStatusClass(task.status)}`}>
                {taskStatusIcon(task.status)}
            </span>
            <span className={task.status === 'completed' ? 'text-[var(--app-hint)] line-through' : 'text-[var(--app-fg)]'}>
                {task.title}
            </span>
            {task.owner && (
                <span className="ml-auto shrink-0 text-[var(--app-hint)]">
                    {task.owner}
                </span>
            )}
        </div>
    )
}

function MessageItem({ msg }: { msg: TeamMessage }) {
    const time = new Date(msg.timestamp)
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`

    const typeIcon = msg.type === 'broadcast' ? '\uD83D\uDCE2'
        : msg.type === 'shutdown_request' ? '\u26D4'
        : msg.type === 'shutdown_response' ? '\u2705'
        : '\uD83D\uDCAC'

    return (
        <div className="flex items-start gap-1.5 text-xs">
            <span className="shrink-0 text-[10px] text-[var(--app-hint)]">{timeStr}</span>
            <span className="shrink-0">{typeIcon}</span>
            <div className="min-w-0">
                <span className="font-medium text-[var(--app-fg)]">{msg.from}</span>
                <span className="text-[var(--app-hint)]"> → </span>
                <span className="font-medium text-[var(--app-fg)]">{msg.to}</span>
                {msg.summary && (
                    <span className="text-[var(--app-hint)]">: {msg.summary}</span>
                )}
            </div>
        </div>
    )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--app-subtle-bg)]">
                <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="shrink-0 text-[10px] text-[var(--app-hint)]">
                {completed}/{total}
            </span>
        </div>
    )
}

export function TeamPanel(props: { teamState: TeamState }) {
    const { teamState } = props
    const members = teamState.members ?? []
    const tasks = teamState.tasks ?? []
    const messages = teamState.messages ?? []

    const activeMembers = members.filter(m => m.status === 'active').length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const hasActivity = activeMembers > 0 || tasks.some(t => t.status === 'in_progress')

    // Default expanded when there's active work
    const [expanded, setExpanded] = useState(hasActivity)

    return (
        <div className="mx-3 mt-3">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center gap-2 rounded-md bg-[var(--app-subtle-bg)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--app-subtle-bg-hover)]"
            >
                {/* Team icon */}
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>

                <span className="font-medium text-[var(--app-fg)]">
                    {teamState.teamName}
                </span>

                {/* Activity indicator */}
                {hasActivity && (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                )}

                {/* Summary badges */}
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--app-hint)]">
                    {members.length > 0 && (
                        <span className="rounded bg-[var(--app-subtle-bg)] px-1 py-px">
                            {activeMembers}/{members.length} agents
                        </span>
                    )}
                    {tasks.length > 0 && (
                        <span className="rounded bg-[var(--app-subtle-bg)] px-1 py-px">
                            {completedTasks}/{tasks.length} tasks
                        </span>
                    )}
                </div>

                {/* Expand chevron */}
                <svg
                    className={`ml-auto h-3 w-3 shrink-0 text-[var(--app-hint)] transition-transform ${expanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>

            {expanded && (
                <div className="mt-1 space-y-2 rounded-md border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5">
                    {teamState.description && (
                        <p className="text-xs text-[var(--app-hint)]">{teamState.description}</p>
                    )}

                    {/* Members */}
                    {members.length > 0 && (
                        <div>
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-hint)]">
                                Agents ({activeMembers} active)
                            </div>
                            <div className="flex flex-col gap-1">
                                {members.map((member) => (
                                    <MemberCard key={member.name} member={member} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tasks with progress */}
                    {tasks.length > 0 && (
                        <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-hint)]">
                                Tasks
                            </div>
                            <ProgressBar completed={completedTasks} total={tasks.length} />
                            <div className="mt-1.5 flex flex-col gap-1">
                                {tasks.map((task, idx) => (
                                    <TaskItem key={task.id ?? String(idx)} task={task} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.length > 0 && (
                        <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--app-hint)]">
                                Messages
                            </div>
                            <div className="flex flex-col gap-1">
                                {messages.slice(-8).map((msg, idx) => (
                                    <MessageItem key={idx} msg={msg} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
