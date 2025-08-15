export const QUEUE_NAMES = {
  ROLES: 'roles',
  FILES: 'files',
  LLM: 'llm',
  EMAIL: 'email'
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]



