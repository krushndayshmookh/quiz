import { randomUUID } from 'crypto'
import { state } from '../../utils/state'

export default defineEventHandler(async (event) => {
  console.log('[api] /api/admin/login POST', event.method)
  const config = useRuntimeConfig()
  const body = await readBody(event)

  if (!body?.password) {
    throw createError({ statusCode: 400, message: 'Password required' })
  }

  if (body.password !== config.adminPassword) {
    throw createError({ statusCode: 401, message: 'Invalid password' })
  }

  const token = randomUUID()
  state.adminToken = token

  return { token }
})
