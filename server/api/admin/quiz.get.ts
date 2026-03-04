import { requireAdmin } from '../../utils/auth'
import { state, validateAnswer } from '../../utils/state'

export default defineEventHandler(async (event) => {
    requireAdmin(event)

  if (!state.quiz) {
    return { quiz: null, phase: state.phase, players: [] }
  }

  // Return full quiz including answers (admin only)
  const players = [...state.players.values()].map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    eliminated: p.eliminated,
    connected: p.connected,
    submitted: p.submitTime !== undefined,
    answers: Object.fromEntries(
      Object.entries(p.answers).map(([qi, ans]) => [
        qi,
        {
          answer: ans,
          correct: validateAnswer(Number(qi), ans),
        },
      ])
    ),
  }))

  return {
    quiz: state.quiz,
    phase: state.phase,
    currentQuestionIndex: state.currentQuestionIndex,
    timerRemaining: state.timerRemaining,
    questionLocked: state.questionLocked,
    players,
    playerCount: state.players.size,
  }
})
