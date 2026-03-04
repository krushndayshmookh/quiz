import { requireAdmin } from '../../utils/auth'
import { state, resetState } from '../../utils/state'
import type { Quiz } from '../../utils/state'

export default defineEventHandler(async (event) => {
  console.log('[api] /api/admin/upload POST', event.method)
  requireAdmin(event)

  if (state.phase !== 'idle') {
    throw createError({ statusCode: 400, message: 'Quiz already loaded. Reset first.' })
  }

  const body = await readBody(event) as Quiz

  // Validate structure
  if (!body?.title || !body?.mode || !Array.isArray(body?.questions)) {
    throw createError({ statusCode: 400, message: 'Invalid quiz format' })
  }
  if (!['classic', 'blitz', 'survival'].includes(body.mode)) {
    throw createError({ statusCode: 400, message: 'Invalid mode' })
  }
  if (body.questions.length === 0) {
    throw createError({ statusCode: 400, message: 'Quiz must have at least one question' })
  }

  const validTypes = ['mcq', 'true-false', 'fill', 'integer', 'match']
  for (const q of body.questions) {
    if (!validTypes.includes(q.type)) {
      throw createError({ statusCode: 400, message: `Unknown question type: ${q.type}` })
    }
    if (!q.question) {
      throw createError({ statusCode: 400, message: 'All questions must have a question field' })
    }
    if (q.answer === undefined || q.answer === null) {
      throw createError({ statusCode: 400, message: 'All questions must have an answer field' })
    }
  }

  state.quiz = body
  state.phase = 'lobby'
  state.currentQuestionIndex = -1
  state.players.clear()
  state.questionLocked = false

  const { io, broadcastPlayers } = (global as any).__nstQuizIo ?? {}
  if (io) {
    io.emit('quiz:loaded', {
      title: body.title,
      mode: body.mode,
      questionCount: body.questions.length,
    })
  }

  return { ok: true, title: body.title, mode: body.mode, questions: body.questions.length }
})
