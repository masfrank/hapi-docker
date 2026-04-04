import { describe, expect, it, vi } from 'vitest'
import { createAttachmentAdapter } from './attachmentAdapter'

describe('createAttachmentAdapter', () => {
    it('uploads attachments to the resolved active session', async () => {
        const uploadFile = vi.fn().mockResolvedValue({
            success: true,
            path: '/tmp/uploaded.png'
        })
        const resolveSessionId = vi.fn().mockResolvedValue('session-active')
        const onSessionResolved = vi.fn()
        const api = {
            uploadFile,
            deleteUploadFile: vi.fn()
        }
        const adapter = createAttachmentAdapter(api as never, 'session-inactive', {
            resolveSessionId,
            onSessionResolved
        })

        const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' })
        const states: unknown[] = []
        const addResult = adapter.add({ file }) as AsyncGenerator<unknown, void, unknown>
        for await (const state of addResult) {
            states.push(state)
        }

        expect(resolveSessionId).toHaveBeenCalledWith('session-inactive')
        expect(onSessionResolved).toHaveBeenCalledWith('session-active')
        expect(uploadFile).toHaveBeenCalledWith(
            'session-active',
            'photo.png',
            expect.any(String),
            'image/png'
        )
        expect(states).toHaveLength(3)
    })

    it('deletes uploaded attachments from the resolved session', async () => {
        const uploadFile = vi.fn().mockResolvedValue({
            success: true,
            path: '/tmp/uploaded.png'
        })
        const deleteUploadFile = vi.fn().mockResolvedValue({ success: true })
        const api = {
            uploadFile,
            deleteUploadFile
        }
        const adapter = createAttachmentAdapter(api as never, 'session-inactive', {
            resolveSessionId: vi.fn().mockResolvedValue('session-active'),
            onSessionResolved: vi.fn()
        })

        const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' })
        let uploaded: unknown = null
        const addResult = adapter.add({ file }) as AsyncGenerator<unknown, void, unknown>
        for await (const state of addResult) {
            uploaded = state
        }

        await adapter.remove(uploaded as never)

        expect(deleteUploadFile).toHaveBeenCalledWith('session-active', '/tmp/uploaded.png')
    })
})
