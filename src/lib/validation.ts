import type { FastifyInstance } from 'fastify'

export function createValidationHook() {
  return async function validationHook(request: any, reply: any) {
    // No-op validation hook
  }
}

export function registerValidationHooks(_app: FastifyInstance) {
  // No-op
}
