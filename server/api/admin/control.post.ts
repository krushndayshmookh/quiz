import { requireAdmin } from '../../utils/auth'
import { state, getSafeQuestion, getSafeQuestionForPlayer, clearTimer, getLeaderboard, getFullLeaderboard } from '../../utils/state'

type ControlAction = 'start' | 'next' | 'lock' | 'end' | 'reset'

export default defineEventHandler(async (event) => {
  console.log('[api] /api/admin/control POST', event.method)
  requireAdmin(event)

  const body = await readBody(event) as { action: ControlAction }
  const { action } = body

  const helpers = (global as any).__nstQuizIo ?? {}
  const { io, startTimer, processAnswersAndScore, emitLeaderboard, broadcastPlayers } = helpers

  if (!io) throw createError({ statusCode: 503, message: 'Socket server not ready' })

  // Send a question to each player with individually shuffled MCQ options
  async function emitQuestionToAll(questionIndex: number, extra: Record<string, unknown> = {}) {
    const q = state.quiz!.questions[questionIndex]
    const safeQ = getSafeQuestion(q)
    const base = {
      index: questionIndex,
      total: state.quiz!.questions.length,
      timer: state.quiz!.timePerQuestion ?? 30,
      locked: false,
      ...extra,
    }

    // Send shuffled version to each connected player socket
    const sockets = await io.in('active-players').fetchSockets()
    console.log('[api] emitQuestionToAll: active-player sockets:', sockets.length, 'state.players:', state.players.size)
    for (const sock of sockets) {
      const player = state.players.get(sock.id)
      if (player) {
        const playerSafeQ = getSafeQuestionForPlayer(q, questionIndex, player)
        sock.emit('quiz:question', { question: playerSafeQ, ...base })
        console.log('[api] sent question to player:', player.name, sock.id)
      } else {
        // Socket in room but not in state — send unshuffled
        sock.emit('quiz:question', { question: safeQ, ...base })
        console.log('[api] sent question to unknown socket:', sock.id)
      }
    }

    // Also broadcast to spectators (leaderboard + late joiners)
    io.to('spectators').emit('quiz:question', { question: safeQ, ...base })
    console.log('[api] sent question to spectators room')
  }

  switch (action) {
    case 'start': {
      if (!state.quiz) throw createError({ statusCode: 400, message: 'No quiz loaded' })
      if (state.phase !== 'lobby') throw createError({ statusCode: 400, message: 'Not in lobby' })

      state.phase = 'question'

      if (state.quiz.mode === 'classic') {
        // Classic: emit all questions per-player with shuffled MCQ options
        io.emit('quiz:started', { mode: 'classic', title: state.quiz.title })
        const classicSockets = await io.in('active-players').fetchSockets()
        console.log('[api] classic start: sending to', classicSockets.length, 'sockets')
        for (const sock of classicSockets) {
          const player = state.players.get(sock.id)
          if (player) {
            const safeQuestions = state.quiz.questions.map((q: any, i: number) => getSafeQuestionForPlayer(q, i, player))
            sock.emit('quiz:allQuestions', {
              questions: safeQuestions,
              title: state.quiz.title,
              total: safeQuestions.length,
            })
          }
        }
        state.currentQuestionIndex = 0
      } else {
        // Blitz / Survival: start lobby, wait for first "next"
        io.emit('quiz:started', { mode: state.quiz.mode, title: state.quiz.title })
        // Send first question with per-player shuffled options
        state.currentQuestionIndex = 0
        state.questionLocked = false
        emitQuestionToAll(0)
        startTimer(state.quiz.timePerQuestion ?? 30, () => {
          processAnswersAndScore()
          emitLeaderboard()
          state.phase = 'leaderboard'
        })
      }
      break
    }

    case 'next': {
      if (!state.quiz) throw createError({ statusCode: 400, message: 'No quiz loaded' })
      if (state.quiz.mode === 'classic') throw createError({ statusCode: 400, message: 'Classic mode has no next' })

      const nextIndex = state.currentQuestionIndex + 1

      if (state.phase === 'question') {
        // Lock current question early, process scores
        clearTimer()
        processAnswersAndScore()
        emitLeaderboard()
        state.phase = 'leaderboard'
        break
      }

      if (state.phase === 'leaderboard') {
        if (nextIndex >= state.quiz.questions.length) {
          // No more questions — end quiz
          state.phase = 'ended'
          const lb = state.quiz.mode === 'survival' ? getFullLeaderboard() : getLeaderboard()
          io.emit('quiz:ended', { leaderboard: lb, title: state.quiz.title, mode: state.quiz.mode })
          break
        }

        state.currentQuestionIndex = nextIndex
        state.questionLocked = false
        state.phase = 'question'
        emitQuestionToAll(nextIndex)
        startTimer(state.quiz.timePerQuestion ?? 30, () => {
          processAnswersAndScore()
          emitLeaderboard()
          state.phase = 'leaderboard'
        })
        break
      }

      throw createError({ statusCode: 400, message: `Cannot advance in phase: ${state.phase}` })
    }

    case 'lock': {
      if (state.phase !== 'question') throw createError({ statusCode: 400, message: 'Not in question phase' })
      if (state.quiz?.mode === 'classic') throw createError({ statusCode: 400, message: 'Classic mode cannot lock' })
      clearTimer()
      processAnswersAndScore()
      emitLeaderboard()
      state.phase = 'leaderboard'
      break
    }

    case 'end': {
      clearTimer()
      state.phase = 'ended'

      if (state.quiz?.mode === 'classic') {
        // Calculate scores for any un-submitted players (score = 0)
        const lb = getLeaderboard()
        io.emit('quiz:ended', {
          leaderboard: lb,
          title: state.quiz.title,
          mode: state.quiz.mode,
          questions: state.quiz.questions.map(getSafeQuestion),
        })
      } else {
        const lb = state.quiz?.mode === 'survival' ? getFullLeaderboard() : getLeaderboard()
        io.emit('quiz:ended', {
          leaderboard: lb,
          title: state.quiz?.title,
          mode: state.quiz?.mode,
        })
      }
      break
    }

    case 'reset': {
      clearTimer()
      const { resetState } = await import('../../utils/state')
      resetState()
      io.emit('quiz:reset', {})
      broadcastPlayers()
      break
    }

    default:
      throw createError({ statusCode: 400, message: 'Unknown action' })
  }

  return { ok: true, phase: state.phase }
})
