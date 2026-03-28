import { useTranslation } from '@/lib/use-translation'
import type { AgentType, PiThinkingLevel } from './types'
import { PI_THINKING_LEVEL_OPTIONS } from './types'

export const PiThinkingLevelSelector = (props: {
    agent: AgentType
    piThinkingLevel: PiThinkingLevel
    isDisabled: boolean
    onThinkingLevelChange: (value: PiThinkingLevel) => void
}) => {
    const { t } = useTranslation()

    if (props.agent !== 'pi') {
        return null
    }

    return (
        <div className="flex flex-col gap-1.5 px-3 py-3">
            <label className="text-xs font-medium text-[var(--app-hint)]">
                {t('newSession.piThinkingLevel')}{' '}
                <span className="font-normal">({t('newSession.model.optional')})</span>
            </label>
            <select
                value={props.piThinkingLevel}
                onChange={(e) => props.onThinkingLevelChange(e.target.value as PiThinkingLevel)}
                disabled={props.isDisabled}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--app-divider)] bg-[var(--app-bg)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-link)] disabled:opacity-50"
            >
                {PI_THINKING_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}
