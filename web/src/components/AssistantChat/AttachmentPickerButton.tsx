import type { ChangeEvent, KeyboardEvent } from 'react'
import { useCallback, useId, useRef } from 'react'

function AttachmentIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a1.5 1.5 0 0 1-2.12-2.12l7.78-7.78" />
        </svg>
    )
}

export function AttachmentPickerButton(props: {
    label: string
    disabled: boolean
    isTouch: boolean
    onFilesSelected: (files: File[]) => void | Promise<void>
}) {
    const inputId = useId()
    const inputRef = useRef<HTMLInputElement>(null)
    const accept = props.isTouch ? 'image/*' : undefined

    const handleChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ''
        if (files.length === 0) {
            return
        }
        await props.onFilesSelected(files)
    }, [props])

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLLabelElement>) => {
        if (props.disabled) {
            return
        }
        if (event.key !== 'Enter' && event.key !== ' ') {
            return
        }
        event.preventDefault()
        inputRef.current?.click()
    }, [props.disabled])

    return (
        <>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                multiple
                accept={accept}
                tabIndex={-1}
                onChange={handleChange}
                className="sr-only"
            />
            <label
                htmlFor={inputId}
                role="button"
                tabIndex={props.disabled ? -1 : 0}
                aria-label={props.label}
                title={props.label}
                onKeyDown={handleKeyDown}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[var(--app-fg)]/60 transition-colors ${
                    props.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:bg-[var(--app-bg)] hover:text-[var(--app-fg)]'
                }`}
            >
                <AttachmentIcon />
            </label>
        </>
    )
}
