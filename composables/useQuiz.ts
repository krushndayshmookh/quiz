import { ref, computed } from 'vue'

export type QuizPhase = 'idle' | 'lobby' | 'question' | 'leaderboard' | 'ended'
export type QuizMode = 'classic' | 'blitz' | 'survival'

export interface SafeQuestion {
  type: 'mcq' | 'true-false' | 'fill' | 'integer' | 'match'
  question: string
  options?: string[]
  left?: string[]
  right?: string[]
}

export interface LeaderboardEntry {
  id: string
  name: string
  score: number
  rank: number
  eliminated: boolean
  connected: boolean
}

export interface PlayerInfo {
  id: string
  name: string
  score: number
  connected: boolean
  eliminated: boolean
}

export function useQuiz() {
  const phase = ref<QuizPhase>('idle')
  const mode = ref<QuizMode | null>(null)
  const title = ref<string>('')
  const playerName = ref<string>('')
  const playerId = ref<string>('')
  const score = ref(0)
  const eliminated = ref(false)

  const currentQuestion = ref<SafeQuestion | null>(null)
  const currentQuestionIndex = ref(-1)
  const totalQuestions = ref(0)
  const timerRemaining = ref(0)
  const timerMax = ref(30)
  const questionLocked = ref(false)
  const myAnswer = ref<unknown>(null)
  const hasAnswered = ref(false)
  const hasSubmitted = ref(false)

  const classicQuestions = ref<SafeQuestion[]>([])
  const classicAnswers = ref<Record<number, unknown>>({})

  const leaderboard = ref<LeaderboardEntry[]>([])
  const players = ref<PlayerInfo[]>([])

  const timerPercent = computed(() => {
    if (timerMax.value <= 0) return 0
    return Math.min(100, (timerRemaining.value / timerMax.value) * 100)
  })

  const timerClass = computed(() => {
    const pct = timerPercent.value
    if (pct > 50) return 'safe'
    if (pct > 25) return 'warn'
    return 'danger'
  })

  function resetQuestionState() {
    myAnswer.value = null
    hasAnswered.value = false
    questionLocked.value = false
  }

  return {
    phase, mode, title, playerName, playerId, score, eliminated,
    currentQuestion, currentQuestionIndex, totalQuestions,
    timerRemaining, timerMax, timerPercent, timerClass, questionLocked,
    myAnswer, hasAnswered, hasSubmitted,
    classicQuestions, classicAnswers,
    leaderboard, players,
    resetQuestionState,
  }
}
