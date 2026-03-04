import { requireAdmin } from '../../utils/auth'
import { state, validateAnswer } from '../../utils/state'

export default defineEventHandler(async (event) => {
  console.log('[api] /api/admin/results GET', event.method)
  requireAdmin(event)

  const query = getQuery(event)

  if (!state.quiz) {
    throw createError({ statusCode: 404, message: 'No quiz loaded' })
  }

  const players = [...state.players.values()]
  const questions = state.quiz.questions

  // Build results with correct/incorrect per question
  const results = players
    .sort((a, b) => b.score - a.score)
    .map((p, i) => {
      const questionResults = questions.map((q, qi) => ({
        answer: p.answers[qi] ?? null,
        correct: validateAnswer(qi, p.answers[qi]),
      }))
      return {
        rank: i + 1,
        name: p.name,
        score: p.score,
        eliminated: p.eliminated,
        questions: questionResults,
      }
    })

  // CSV export
  if (query.format === 'csv') {
    const headers = [
      'Rank',
      'Name',
      ...questions.flatMap((_, i) => [`Q${i + 1}`, `Q${i + 1}_Correct`]),
      'Total_Score',
    ]

    const rows = results.map(r => [
      r.rank,
      `"${r.name.replace(/"/g, '""')}"`,
      ...r.questions.flatMap(q => [
        typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer ?? ''),
        q.correct ? '1' : '0',
      ]),
      r.score,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    setHeader(event, 'Content-Type', 'text/csv')
    setHeader(event, 'Content-Disposition', `attachment; filename="quiz-results.csv"`)
    return csv
  }

  return {
    title: state.quiz.title,
    mode: state.quiz.mode,
    phase: state.phase,
    questions: questions.map((q, i) => ({
      type: q.type,
      question: q.question,
      answer: q.answer,
      options: q.options,
      left: q.left,
      right: q.right,
    })),
    results,
  }
})
