import { state, getSafeQuestion, getLeaderboard } from '../../utils/state'

export default defineEventHandler(() => {
  console.log('[api] /api/quiz/current GET')
  if (!state.quiz) {
    return { phase: 'idle', quiz: null }
  }

  const base = {
    phase: state.phase,
    mode: state.quiz.mode,
    title: state.quiz.title,
    playerCount: state.players.size,
    currentQuestionIndex: state.currentQuestionIndex,
    timerRemaining: state.timerRemaining,
    questionLocked: state.questionLocked,
    total: state.quiz.questions.length,
  }

  if (state.phase === 'leaderboard' || state.phase === 'ended') {
    return {
      ...base,
      leaderboard: getLeaderboard(),
    }
  }

  // Never expose the full question list in blitz/survival
  if (state.phase === 'question' && state.quiz.mode !== 'classic') {
    const q = state.quiz.questions[state.currentQuestionIndex]
    return {
      ...base,
      question: q ? getSafeQuestion(q) : null,
    }
  }

  return base
})
