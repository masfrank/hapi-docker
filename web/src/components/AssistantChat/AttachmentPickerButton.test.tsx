import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttachmentPickerButton } from './AttachmentPickerButton'

describe('AttachmentPickerButton', () => {
    it('uses an image picker on touch devices', () => {
        const { container } = render(
            <AttachmentPickerButton
                label="Attach"
                disabled={false}
                isTouch={true}
                onFilesSelected={vi.fn()}
            />
        )

        const input = container.querySelector('input[type="file"]')
        expect(input).not.toBeNull()
        expect(input?.getAttribute('accept')).toBe('image/*')
    })

    it('keeps the generic picker on non-touch devices', () => {
        const { container } = render(
            <AttachmentPickerButton
                label="Attach"
                disabled={false}
                isTouch={false}
                onFilesSelected={vi.fn()}
            />
        )

        const input = container.querySelector('input[type="file"]')
        expect(input).not.toBeNull()
        expect(input?.getAttribute('accept')).toBeNull()
    })

    it('forwards selected files and clears the input value', async () => {
        const onFilesSelected = vi.fn().mockResolvedValue(undefined)
        const { container } = render(
            <AttachmentPickerButton
                label="Attach"
                disabled={false}
                isTouch={true}
                onFilesSelected={onFilesSelected}
            />
        )

        const input = container.querySelector('input[type="file"]') as HTMLInputElement | null
        expect(input).not.toBeNull()
        const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })

        Object.defineProperty(input, 'files', {
            configurable: true,
            value: [file]
        })
        Object.defineProperty(input, 'value', {
            configurable: true,
            writable: true,
            value: 'C:\\fakepath\\photo.jpg'
        })

        fireEvent.change(input as HTMLInputElement)

        await vi.waitFor(() => {
            expect(onFilesSelected).toHaveBeenCalledWith([file])
        })
        expect(input?.value).toBe('')
    })
})
