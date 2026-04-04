import type { AttachmentAdapter, PendingAttachment, CompleteAttachment, Attachment } from '@assistant-ui/react'
import type { ApiClient } from '@/api/client'
import type { AttachmentMetadata } from '@/types/api'
import { isImageMimeType } from '@/lib/fileAttachments'
import { makeClientSideId } from '@/lib/messages'

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024

export type AttachmentUploadOptions = {
    resolveSessionId?: (sessionId: string) => Promise<string>
    onSessionResolved?: (sessionId: string) => void
}

type PendingUploadAttachment = PendingAttachment & {
    path?: string
    previewUrl?: string
    sessionId?: string
}

export async function resolveAttachmentSessionId(
    sessionId: string,
    options?: AttachmentUploadOptions
): Promise<string> {
    if (!options?.resolveSessionId) {
        return sessionId
    }
    const resolvedSessionId = await options.resolveSessionId(sessionId)
    if (resolvedSessionId !== sessionId) {
        options.onSessionResolved?.(resolvedSessionId)
    }
    return resolvedSessionId
}

export async function uploadAttachmentFile(args: {
    api: ApiClient
    sessionId: string
    file: File
    options?: AttachmentUploadOptions
}): Promise<{ metadata: AttachmentMetadata; sessionId: string }> {
    const contentType = args.file.type || 'application/octet-stream'
    if (args.file.size > MAX_UPLOAD_BYTES) {
        throw new Error('File too large (max 50MB)')
    }

    const targetSessionId = await resolveAttachmentSessionId(args.sessionId, args.options)
    const content = await fileToBase64(args.file)
    const result = await args.api.uploadFile(targetSessionId, args.file.name, content, contentType)
    if (!result.success || !result.path) {
        throw new Error(result.error || 'Failed to upload file')
    }

    let previewUrl: string | undefined
    if (isImageMimeType(contentType) && args.file.size <= MAX_PREVIEW_BYTES) {
        previewUrl = await fileToDataUrl(args.file)
    }

    return {
        sessionId: targetSessionId,
        metadata: {
            id: makeClientSideId('attachment'),
            filename: args.file.name,
            mimeType: contentType,
            size: args.file.size,
            path: result.path,
            previewUrl
        }
    }
}

export async function deleteUploadedAttachment(args: {
    api: ApiClient
    sessionId: string
    path?: string
}): Promise<void> {
    if (!args.path) {
        return
    }
    await args.api.deleteUploadFile(args.sessionId, args.path)
}

export function createAttachmentAdapter(api: ApiClient, sessionId: string, options?: AttachmentUploadOptions): AttachmentAdapter {
    const cancelledAttachmentIds = new Set<string>()
    let currentSessionId = sessionId

    const resolveTargetSessionId = async (): Promise<string> => {
        const resolvedSessionId = await resolveAttachmentSessionId(currentSessionId, options)
        if (resolvedSessionId !== currentSessionId) {
            currentSessionId = resolvedSessionId
        }
        return currentSessionId
    }

    const deleteUpload = async (path?: string, targetSessionId?: string) => {
        if (!path) return
        try {
            await deleteUploadedAttachment({
                api,
                sessionId: targetSessionId ?? currentSessionId,
                path
            })
        } catch {
            // Best effort cleanup
        }
    }

    return {
        accept: '*/*',

        async *add({ file }): AsyncGenerator<PendingAttachment> {
            const id = makeClientSideId('attachment')
            const contentType = file.type || 'application/octet-stream'

            yield {
                id,
                type: 'file',
                name: file.name,
                contentType,
                file,
                status: { type: 'running', reason: 'uploading', progress: 0 }
            }

            try {
                if (cancelledAttachmentIds.has(id)) {
                    return
                }

                const targetSessionId = await resolveTargetSessionId()
                if (cancelledAttachmentIds.has(id)) {
                    return
                }

                if (file.size > MAX_UPLOAD_BYTES) {
                    yield {
                        id,
                        type: 'file',
                        name: file.name,
                        contentType,
                        file,
                        status: { type: 'incomplete', reason: 'error' }
                    }
                    return
                }

                const content = await fileToBase64(file)
                if (cancelledAttachmentIds.has(id)) {
                    return
                }

                yield {
                    id,
                    type: 'file',
                    name: file.name,
                    contentType,
                    file,
                    status: { type: 'running', reason: 'uploading', progress: 50 }
                }

                const result = await api.uploadFile(targetSessionId, file.name, content, contentType)
                if (cancelledAttachmentIds.has(id)) {
                    if (result.success && result.path) {
                        await deleteUpload(result.path, targetSessionId)
                    }
                    return
                }

                if (!result.success || !result.path) {
                    yield {
                        id,
                        type: 'file',
                        name: file.name,
                        contentType,
                        file,
                        status: { type: 'incomplete', reason: 'error' }
                    }
                    return
                }

                // Generate preview URL for images under 5MB
                let previewUrl: string | undefined
                if (isImageMimeType(contentType) && file.size <= MAX_PREVIEW_BYTES) {
                    previewUrl = await fileToDataUrl(file)
                }

                yield {
                    id,
                    type: 'file',
                    name: file.name,
                    contentType,
                    file,
                    status: { type: 'requires-action', reason: 'composer-send' },
                    path: result.path,
                    previewUrl,
                    sessionId: targetSessionId
                } as PendingUploadAttachment
            } catch {
                yield {
                    id,
                    type: 'file',
                    name: file.name,
                    contentType,
                    file,
                    status: { type: 'incomplete', reason: 'error' }
                }
            }
        },

        async remove(attachment: Attachment): Promise<void> {
            cancelledAttachmentIds.add(attachment.id)
            const pending = attachment as PendingUploadAttachment
            await deleteUpload(pending.path, pending.sessionId)
        },

        async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
            const pending = attachment as PendingUploadAttachment
            const path = pending.path

            // Build AttachmentMetadata to be sent with the message
            const metadata: AttachmentMetadata | undefined = path ? {
                id: attachment.id,
                filename: attachment.name,
                mimeType: attachment.contentType ?? 'application/octet-stream',
                size: attachment.file?.size ?? 0,
                path,
                previewUrl: pending.previewUrl
            } : undefined

            return {
                id: attachment.id,
                type: attachment.type,
                name: attachment.name,
                contentType: attachment.contentType,
                status: { type: 'complete' },
                // Store metadata as JSON in the text content for extraction by assistant-runtime
                content: metadata ? [{ type: 'text', text: JSON.stringify({ __attachmentMetadata: metadata }) }] : []
            }
        }
    }
}

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            if (!base64) {
                reject(new Error('Failed to read file'))
                return
            }
            resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            resolve(reader.result as string)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
