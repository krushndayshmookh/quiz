import type { H3Event } from 'h3'
import { state } from './state'

export function requireAdmin(event: H3Event) {
  const auth = getHeader(event, 'authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!state.adminToken || token !== state.adminToken) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}
