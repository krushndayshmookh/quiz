import type { Server as SocketIOServer } from 'socket.io'

export interface QuizQuestion {
  type: 'mcq' | 'true-false' | 'fill' | 'integer' | 'match'
  question: string
  options?: string[]
  answer: number | boolean | string | number[][]
  caseSensitive?: boolean
  left?: string[]
  right?: string[]
}

export interface Quiz {
  title: string
  mode: 'classic' | 'blitz' | 'survival'
  timePerQuestion?: number
  questions: QuizQuestion[]
}

// Per-player MCQ option shuffle: questionIndex -> array mapping displayed position to original index
// e.g. [2, 0, 3, 1] means displayed option 0 = original option 2
export type ShuffleMap = Record<number, number[]>

export interface Player {
  id: string
  name: string
  score: number
  answers: Record<number, unknown>
  answerTime: Record<number, number>
  eliminated: boolean
  connected: boolean
  submitTime?: number
  shuffleMap: ShuffleMap
  spectator?: boolean
}

export type QuizPhase = 'idle' | 'lobby' | 'question' | 'leaderboard' | 'ended'

export interface QuizState {
  quiz: Quiz | null
  phase: QuizPhase
  currentQuestionIndex: number
  timerRemaining: number
  questionStartTime: number
  timerInterval: ReturnType<typeof setInterval> | null
  players: Map<string, Player>
  adminToken: string | null
  io: SocketIOServer | null
  questionLocked: boolean
  hideScores: boolean
  allowLateJoin: boolean
}

export const state: QuizState = {
  quiz: null,
  phase: 'idle',
  currentQuestionIndex: -1,
  timerRemaining: 0,
  questionStartTime: 0,
  timerInterval: null,
  players: new Map(),
  adminToken: null,
  io: null,
  questionLocked: false,
  hideScores: false,
  allowLateJoin: false,
}

// Strip answer fields from a question before sending to clients
export function getSafeQuestion(q: QuizQuestion): Omit<QuizQuestion, 'answer' | 'caseSensitive'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { answer, caseSensitive, ...safe } = q
  return safe
}



// Fisher-Yates shuffle, returns shuffled array and the index mapping (shuffled[i] came from original[map[i]])
export function shuffleOptions(options: string[]): { shuffled: string[]; map: number[] } {
  const indices = options.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return {
    shuffled: indices.map(i => options[i]),
    map: indices, // map[displayPos] = originalPos
  }
}

// Get a safe question with shuffled MCQ options for a specific player
export function getSafeQuestionForPlayer(q: QuizQuestion, questionIndex: number, player: Player): Omit<QuizQuestion, 'answer' | 'caseSensitive'> {
  const safe = getSafeQuestion(q)
  if (q.type === 'mcq' && safe.options) {
    const { shuffled, map } = shuffleOptions(safe.options)
    player.shuffleMap[questionIndex] = map
    return { ...safe, options: shuffled }
  }
  return safe
}

// Translate a player's MCQ answer back to the original option index
export function unshuffleAnswer(questionIndex: number, playerAnswer: unknown, player: Player): unknown {
  const question = state.quiz?.questions[questionIndex]
  if (!question || question.type !== 'mcq') return playerAnswer
  const map = player.shuffleMap[questionIndex]
  if (!map || typeof playerAnswer !== 'number') return playerAnswer
  return map[playerAnswer] // convert displayed index to original index
}

// Calculate time-decayed Blitz score
export function calculateBlitzScore(timeUsedMs: number, timeLimitSeconds: number): number {
  if (timeLimitSeconds <= 0) return 1000
  const ratio = Math.max(0, 1 - timeUsedMs / (timeLimitSeconds * 1000))
  return Math.max(100, Math.floor(1000 * ratio))
}

// Validate a player's answer server-side
export function validateAnswer(questionIndex: number, playerAnswer: unknown): boolean {
  if (!state.quiz) return false
  const question = state.quiz.questions[questionIndex]
  if (!question) return false

  switch (question.type) {
    case 'mcq':
      return playerAnswer === question.answer
    case 'true-false':
      return playerAnswer === question.answer
    case 'fill': {
      const expected = String(question.answer)
      const given = String(playerAnswer)
      if (question.caseSensitive) return given.trim() === expected.trim()
      return given.trim().toLowerCase() === expected.trim().toLowerCase()
    }
    case 'integer':
      return Number(playerAnswer) === Number(question.answer)
    case 'match': {
      const expected = question.answer as number[][]
      const given = playerAnswer as number[][]
      if (!Array.isArray(given) || given.length !== expected.length) return false
      const sortPairs = (pairs: number[][]) =>
        [...pairs].sort((a, b) => a[0] - b[0] || a[1] - b[1])
      const se = sortPairs(expected)
      const sg = sortPairs(given)
      return se.every((pair, i) => pair[0] === sg[i]?.[0] && pair[1] === sg[i]?.[1])
    }
  }
}

// Returns how many pairs in a match answer are correct (for partial scoring)
export function countCorrectMatchPairs(questionIndex: number, playerAnswer: unknown): number {
  if (!state.quiz) return 0
  const question = state.quiz.questions[questionIndex]
  if (!question || question.type !== 'match') return 0
  const expected = question.answer as number[][]
  const given = playerAnswer as number[][]
  if (!Array.isArray(given)) return 0
  return given.filter(([gl, gr]) => expected.some(([el, er]) => el === gl && er === gr)).length
}

// Sorted leaderboard (public-safe, no answer data)
export function getLeaderboard() {
  return [...state.players.values()]
    .filter(p => !p.spectator)
    .filter(p => !p.eliminated || (state.quiz?.mode !== 'survival'))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Tiebreak: earlier submit wins
      const aTime = a.submitTime ?? Infinity
      const bTime = b.submitTime ?? Infinity
      return aTime - bTime
    })
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      rank: i + 1,
      eliminated: p.eliminated,
      connected: p.connected,
    }))
}

// Full leaderboard including eliminated (for survival spectators)
export function getFullLeaderboard() {
  return [...state.players.values()]
    .filter(p => !p.spectator)
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
      return b.score - a.score
    })
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      rank: i + 1,
      eliminated: p.eliminated,
      connected: p.connected,
    }))
}

// Clear timer
export function clearTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval)
    state.timerInterval = null
  }
}

// Reset state for a new quiz session
export function resetState() {
  clearTimer()
  state.quiz = null
  state.phase = 'idle'
  state.currentQuestionIndex = -1
  state.timerRemaining = 0
  state.questionStartTime = 0
  state.players.clear()
  state.questionLocked = false
  state.hideScores = false
  state.allowLateJoin = false
}
