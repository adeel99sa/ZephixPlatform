export type RoleSeedPayload = { tenantId: string, force: boolean }
export type FileProcessPayload = { fileId: string, bucket: string, key: string }
export type LlmCallPayload = { correlationId: string, model: string, prompt: string, metadata?: Record<string, any> }
export type EmailPayload = { to: string, subject: string, template: string, vars?: Record<string, any> }



