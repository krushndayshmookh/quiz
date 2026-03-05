<script setup lang="ts">
import type { SafeQuestion, LeaderboardEntry, PlayerInfo } from '~/composables/useQuiz'

useHead({ title: 'Playing — NST Quiz' })

const router = useRouter()
const { connect, on, off, emit: socketEmit } = useSocket()
const { fireConfetti, fireSideConfetti } = useConfetti()

// ─── State ────────────────────────────────────────────────────────────────────
const phase = ref<'connecting' | 'lobby' | 'question' | 'leaderboard' | 'ended' | 'eliminated_spectate'>('connecting')
const mode = ref<'classic' | 'blitz' | 'survival' | null>(null)
const quizTitle = ref('')
const playerName = ref('')
const isEliminated = ref(false)
const myScore = ref(0)
const isSpectator = ref(false)

const currentQuestion = ref<SafeQuestion | null>(null)
const currentQIndex = ref(-1)
const totalQuestions = ref(0)
const timerRemaining = ref(0)
const timerMax = ref(30)
const questionLocked = ref(false)

const myAnswer = ref<unknown>(null)
const hasAnswered = ref(false)

// Classic mode: all questions at once
const classicQuestions = ref<SafeQuestion[]>([])
const classicAnswers = ref<Record<number, unknown>>({})
const classicCurrentIndex = ref(0)
const hasSubmittedClassic = ref(false)
const classicScore = ref<number | null>(null)

// Post-answer feedback (blitz/survival)
const lastCorrect = ref<boolean | null>(null)

const leaderboard = ref<LeaderboardEntry[]>([])
const players = ref<PlayerInfo[]>([])

const submitCount = ref(0)
const submitTotal = ref(0)
const answerCount = ref(0)
const answerTotal = ref(0)

// ─── Blitz potential score ────────────────────────────────────────────────────
const lockedBlitzScore = ref<number | null>(null)

// ─── Reveal / review data ─────────────────────────────────────────────────────
const revealedAnswer = ref<unknown>(null)
// Blitz/survival: collect all questions and answers for review
const allQuestions = ref<Array<{ index: number; question: SafeQuestion }>>([])
const allMyAnswers = ref<Record<number, unknown>>({})
const allCorrectAnswers = ref<Record<number, unknown>>({})

// ─── Computed ─────────────────────────────────────────────────────────────────
const timerPercent = computed(() => timerMax.value > 0 ? (timerRemaining.value / timerMax.value) * 100 : 0)
const timerClass = computed(() => {
  const p = timerPercent.value
  return p > 50 ? 'safe' : p > 25 ? 'warn' : 'danger'
})

const myRank = computed(() => {
  const idx = leaderboard.value.findIndex(e => e.name === playerName.value)
  return idx >= 0 ? idx + 1 : null
})

const potentialScore = computed(() => {
  if (mode.value !== 'blitz') return 0
  if (hasAnswered.value && lockedBlitzScore.value !== null) return lockedBlitzScore.value
  return Math.max(0, Math.round(1000 * (timerRemaining.value / timerMax.value)))
})

const potentialScoreClass = computed(() => {
  const s = potentialScore.value
  if (s >= 600) return 'score-mint'
  if (s >= 300) return 'score-yellow'
  return 'score-coral'
})

// ─── Socket setup ─────────────────────────────────────────────────────────────
onMounted(async () => {
  const name = localStorage.getItem('nst-player-name')
  if (!name) { router.push('/'); return }
  playerName.value = name

  await connect()

  on('quiz:joined', (data: any) => {
    phase.value = data.phase === 'idle' ? 'lobby' : (data.phase as any)
    mode.value = data.mode
    quizTitle.value = data.quizTitle ?? ''
    isEliminated.value = data.eliminated ?? false
    isSpectator.value = data.spectator ?? false
    if (data.submitted) {
      hasSubmittedClassic.value = true
      classicScore.value = data.score ?? null
    }
    if (isEliminated.value) phase.value = 'eliminated_spectate'
  })

  on('quiz:loaded', (data: any) => {
    quizTitle.value = data.title
    mode.value = data.mode
    phase.value = 'lobby'
  })

  on('quiz:started', (data: any) => {
    console.log('[play] quiz:started', data)
    mode.value = data.mode
    quizTitle.value = data.title
    phase.value = 'question'
    myAnswer.value = null
    hasAnswered.value = false
    revealedAnswer.value = null
    lockedBlitzScore.value = null
    allQuestions.value = []
    allMyAnswers.value = {}
    allCorrectAnswers.value = {}
  })

  on('quiz:allQuestions', (data: any) => {
    // Classic mode — all questions at once
    console.log('[play] quiz:allQuestions received, count:', data.questions?.length)
    classicQuestions.value = data.questions
    totalQuestions.value = data.total
    phase.value = 'question'
    hasSubmittedClassic.value = false
    classicAnswers.value = {}
    classicCurrentIndex.value = 0
  })

  on('quiz:question', (data: any) => {
    console.log('[play] quiz:question received, index:', data.index, 'mode:', mode.value)
    phase.value = 'question'
    currentQuestion.value = data.question
    currentQIndex.value = data.index
    totalQuestions.value = data.total
    timerRemaining.value = data.timer
    timerMax.value = data.timer
    questionLocked.value = data.locked ?? false
    myAnswer.value = null
    hasAnswered.value = false
    lastCorrect.value = null
    answerCount.value = 0
    answerTotal.value = 0
    revealedAnswer.value = null
    lockedBlitzScore.value = null
    phase.value = 'question'
    // Collect questions for review
    allQuestions.value.push({ index: data.index, question: data.question })
  })

  on('quiz:timer', (data: any) => {
    timerRemaining.value = data.remaining
  })

  on('quiz:answerAck', () => {
    hasAnswered.value = true
  })

  on('quiz:answerCount', (data: any) => {
    if (data.questionIndex === currentQIndex.value) {
      answerCount.value = data.count
      answerTotal.value = data.total
    }
  })

  on('quiz:reveal', (data: any) => {
    revealedAnswer.value = data.correctAnswer
    allCorrectAnswers.value[data.questionIndex] = data.correctAnswer
  })

  on('quiz:submitAck', (data: any) => {
    hasSubmittedClassic.value = true
    classicScore.value = data.score
    submitCount.value++
  })

  on('quiz:submitCount', (data: any) => {
    submitCount.value = data.count
    submitTotal.value = data.total
  })

  on('quiz:leaderboard', (data: any) => {
    leaderboard.value = data.leaderboard
    if (!isEliminated.value) phase.value = 'leaderboard'
    // Update my score
    const me = data.leaderboard.find((e: LeaderboardEntry) => e.name === playerName.value)
    if (me) myScore.value = me.score
  })

  on('quiz:eliminated', () => {
    isEliminated.value = true
    phase.value = 'eliminated_spectate'
  })

  on('quiz:ended', async (data: any) => {
    leaderboard.value = data.leaderboard ?? []
    phase.value = 'ended'
    const me = leaderboard.value.find(e => e.name === playerName.value)
    if (me) myScore.value = me.score

    // Build review data
    const reviewQuestions = mode.value === 'classic'
      ? classicQuestions.value.map((q, i) => ({ index: i, question: q }))
      : allQuestions.value
    const reviewAnswers = mode.value === 'classic' ? classicAnswers.value : allMyAnswers.value

    localStorage.setItem('nst-review', JSON.stringify({
      playerName: playerName.value,
      quizTitle: quizTitle.value,
      mode: mode.value,
      score: me?.score ?? myScore.value,
      rank: me?.rank ?? myRank.value,
      questions: reviewQuestions,
      answers: reviewAnswers,
      correctAnswers: allCorrectAnswers.value,
      totalPlayers: leaderboard.value.length,
      timestamp: Date.now(),
    }))

    if (me && me.rank <= 3) {
      await nextTick()
      await fireConfetti({ top3: true })
    } else {
      await fireConfetti()
    }
  })

  on('quiz:reset', () => {
    phase.value = 'lobby'
    mode.value = null
    quizTitle.value = ''
    isEliminated.value = false
    leaderboard.value = []
    currentQuestion.value = null
    hasSubmittedClassic.value = false
    classicAnswers.value = {}
    myScore.value = 0
    revealedAnswer.value = null
    lockedBlitzScore.value = null
    allQuestions.value = []
    allMyAnswers.value = {}
    allCorrectAnswers.value = {}
  })

  on('players:updated', (data: any) => {
    players.value = data.players
  })

  // Handle reconnection
  on('connect', () => {
    socketEmit('player:join', { name: playerName.value })
  })

  // Join immediately (if already connected)
  socketEmit('player:join', { name: playerName.value })
})

onUnmounted(() => {
  off('connect')
  off('quiz:joined')
  off('quiz:loaded')
  off('quiz:started')
  off('quiz:allQuestions')
  off('quiz:question')
  off('quiz:timer')
  off('quiz:answerAck')
  off('quiz:answerCount')
  off('quiz:reveal')
  off('quiz:submitAck')
  off('quiz:submitCount')
  off('quiz:leaderboard')
  off('quiz:eliminated')
  off('quiz:ended')
  off('quiz:reset')
  off('players:updated')
})

// ─── Answer handlers ──────────────────────────────────────────────────────────
function submitAnswer(answer: unknown) {
  if (isSpectator.value || hasAnswered.value || questionLocked.value) return
  myAnswer.value = answer
  if (mode.value === 'blitz') {
    lockedBlitzScore.value = Math.max(0, Math.round(1000 * (timerRemaining.value / timerMax.value)))
  }
  allMyAnswers.value[currentQIndex.value] = answer
  socketEmit('player:answer', { questionIndex: currentQIndex.value, answer })
}

function submitClassic() {
  if (isSpectator.value || hasSubmittedClassic.value) return
  socketEmit('player:submit', { answers: classicAnswers.value })
}

function setClassicAnswer(qi: number, answer: unknown) {
  classicAnswers.value[qi] = answer
}

function classicNext() {
  if (classicCurrentIndex.value < classicQuestions.value.length - 1) {
    classicCurrentIndex.value++
  }
}

function classicPrev() {
  if (classicCurrentIndex.value > 0) {
    classicCurrentIndex.value--
  }
}

function classicGoTo(qi: number) {
  classicCurrentIndex.value = qi
}

const classicCurrentQ = computed(() => classicQuestions.value[classicCurrentIndex.value] ?? null)
const classicAnsweredCount = computed(() => Object.keys(classicAnswers.value).length)
</script>

<template>
  <div class="play-page">
    <!-- ─── CONNECTING ─── -->
    <div v-if="phase === 'connecting'" class="page-center">
      <div class="status-screen">
        <div class="status-icon animate__animated animate__pulse animate__infinite">
          <i class="la la-spinner la-spin la-3x" />
        </div>
        <h2>Connecting...</h2>
      </div>
    </div>

    <!-- ─── LOBBY ─── -->
    <div v-else-if="phase === 'lobby'" class="page-center">
      <div class="card lobby-card animate__animated animate__bounceIn">
        <div class="text-center">
          <div class="lobby-icon">
            <i class="la la-users la-3x" />
          </div>
          <h2 class="mt-2">{{ quizTitle || 'Waiting for quiz...' }}</h2>
          <div v-if="mode" class="mt-1">
            <span class="badge" :class="`badge-${mode === 'classic' ? 'sky' : mode === 'blitz' ? 'yellow' : 'coral'}`">
              <i :class="`la la-${mode === 'classic' ? 'graduation-cap' : mode === 'blitz' ? 'bolt' : 'shield-alt'}`" />
              {{ mode.charAt(0).toUpperCase() + mode.slice(1) }} Mode
            </span>
          </div>
          <p class="text-muted mt-3">
            <i class="la la-user" /> You're in as <strong>{{ playerName }}</strong>
          </p>
          <div class="lobby-waiting mt-3 animate__animated animate__pulse animate__infinite">
            <i class="la la-clock" />
            Waiting for the quiz to start...
          </div>
          <div v-if="players.length > 0" class="lobby-players mt-3">
            <p class="text-muted text-sm mb-1"><i class="la la-users" /> {{ players.length }} player{{ players.length !== 1 ? 's' : '' }} joined</p>
            <PlayerList :players="players" />
          </div>
        </div>
      </div>
    </div>

    <!-- ─── QUESTION (Blitz / Survival) ─── -->
    <div v-else-if="phase === 'question' && mode !== 'classic'" class="play-question-page">
      <!-- Spectator banner -->
      <div v-if="isSpectator" class="spectator-banner animate__animated animate__fadeInDown">
        <i class="la la-eye" /> You joined late — watching as spectator
      </div>
      <div class="play-topbar">
        <div class="play-meta">
          <span class="badge" :class="`badge-${mode === 'blitz' ? 'yellow' : 'coral'}`">
            <i :class="`la la-${mode === 'blitz' ? 'bolt' : 'shield-alt'}`" />
            Q{{ currentQIndex + 1 }}/{{ totalQuestions }}
          </span>
          <span class="play-score">
            <i class="la la-star" /> {{ myScore.toLocaleString() }}
          </span>
        </div>
        <div class="play-timer-area">
          <!-- Potential score countdown for blitz -->
          <div
            v-if="mode === 'blitz' && !questionLocked"
            class="potential-score animate__animated animate__fadeIn"
            :class="potentialScoreClass"
          >
            <i class="la la-bolt" />
            <span>{{ potentialScore.toLocaleString() }} pts</span>
          </div>
          <Timer v-if="!questionLocked" :remaining="timerRemaining" :max="timerMax" />
          <div v-else class="locked-badge badge badge-dark">
            <i class="la la-lock" /> Time's up
          </div>
        </div>
      </div>

      <div class="play-question-body container-sm">
        <div v-if="currentQuestion">
          <!-- MCQ -->
          <QuestionMCQ
            v-if="currentQuestion.type === 'mcq'"
            :question="currentQuestion.question"
            :options="currentQuestion.options ?? []"
            :question-index="currentQIndex"
            :locked="questionLocked || hasAnswered"
            :selected="(myAnswer as number | null)"
            :correct-answer="(revealedAnswer as number | null)"
            @answer="submitAnswer"
          />

          <!-- True/False -->
          <QuestionTrueFalse
            v-else-if="currentQuestion.type === 'true-false'"
            :question="currentQuestion.question"
            :locked="questionLocked || hasAnswered"
            :selected="(myAnswer as boolean | null)"
            :correct-answer="(revealedAnswer as boolean | null)"
            @answer="submitAnswer"
          />

          <!-- Fill in the blank -->
          <QuestionFillBlank
            v-else-if="currentQuestion.type === 'fill'"
            :question="currentQuestion.question"
            :locked="questionLocked || hasAnswered"
            :submitted="hasAnswered"
            :correct-answer="(revealedAnswer as string | null)"
            @answer="submitAnswer"
          />

          <!-- Integer -->
          <QuestionInteger
            v-else-if="currentQuestion.type === 'integer'"
            :question="currentQuestion.question"
            :locked="questionLocked || hasAnswered"
            :correct-answer="(revealedAnswer as number | null)"
            @answer="submitAnswer"
          />

          <!-- Match -->
          <QuestionMatch
            v-else-if="currentQuestion.type === 'match'"
            :question="currentQuestion.question"
            :left="currentQuestion.left ?? []"
            :right="currentQuestion.right ?? []"
            :locked="questionLocked || hasAnswered"
            :correct-answer="(revealedAnswer as number[][] | null)"
            @answer="submitAnswer"
          />
        </div>

        <!-- Answered confirmation -->
        <div v-if="hasAnswered && !questionLocked" class="answered-badge animate__animated animate__bounceIn">
          <i class="la la-check-circle" /> Answer locked in! Waiting for others...
          <div v-if="answerTotal > 0" class="answer-progress mt-1">
            {{ answerCount }}/{{ answerTotal }} answered
          </div>
        </div>

        <div v-if="questionLocked && !hasAnswered" class="missed-badge animate__animated animate__shakeX">
          <i class="la la-clock" /> Time's up — no answer submitted
        </div>
      </div>
    </div>

    <!-- ─── QUESTION (Classic — all questions at once) ─── -->
    <div v-else-if="phase === 'question' && mode === 'classic'" class="play-classic-page">
      <div v-if="isSpectator" class="spectator-banner animate__animated animate__fadeInDown">
        <i class="la la-eye" /> You joined late — watching as spectator
      </div>

      <!-- Top bar -->
      <div class="classic-topbar">
        <div class="classic-topbar-inner">
          <div>
            <h2 class="font-black" style="font-size:1.1rem; margin:0">{{ quizTitle }}</h2>
            <span class="badge badge-sky"><i class="la la-graduation-cap" /> Classic</span>
          </div>
          <div class="classic-progress-area">
            <span class="text-muted text-sm" style="font-weight:700">
              {{ classicAnsweredCount }}/{{ totalQuestions }} answered
            </span>
            <button
              v-if="!hasSubmittedClassic"
              class="btn btn-mint"
              :disabled="classicAnsweredCount === 0 || isSpectator"
              @click="submitClassic"
            >
              <i class="la la-paper-plane" /> Submit
            </button>
            <span v-else class="badge badge-mint" style="font-size:0.95rem; padding:0.4rem 0.8rem">
              <i class="la la-check-circle" /> Submitted
            </span>
          </div>
        </div>
      </div>

      <!-- Question navigator dots -->
      <div class="classic-nav-dots">
        <button
          v-for="(q, qi) in classicQuestions"
          :key="qi"
          class="nav-dot"
          :class="{
            active: qi === classicCurrentIndex,
            answered: classicAnswers[qi] !== undefined,
            current: qi === classicCurrentIndex,
          }"
          @click="classicGoTo(qi)"
        >
          {{ qi + 1 }}
        </button>
      </div>

      <!-- Single question display -->
      <div class="container-sm classic-single-body">
        <div v-if="classicCurrentQ" class="card classic-question-card animate__animated animate__fadeIn" :key="classicCurrentIndex">
          <div class="question-number">
            <i class="la la-question-circle" />
            Question {{ classicCurrentIndex + 1 }} of {{ totalQuestions }}
          </div>

          <QuestionMCQ
            v-if="classicCurrentQ.type === 'mcq'"
            :question="classicCurrentQ.question"
            :options="classicCurrentQ.options ?? []"
            :question-index="classicCurrentIndex"
            :locked="hasSubmittedClassic || isSpectator"
            :allow-change="!hasSubmittedClassic"
            :selected="(classicAnswers[classicCurrentIndex] as number | null) ?? null"
            @answer="(v: number) => setClassicAnswer(classicCurrentIndex, v)"
          />
          <QuestionTrueFalse
            v-else-if="classicCurrentQ.type === 'true-false'"
            :question="classicCurrentQ.question"
            :locked="hasSubmittedClassic || isSpectator"
            :allow-change="!hasSubmittedClassic"
            :selected="(classicAnswers[classicCurrentIndex] as boolean | null) ?? null"
            @answer="(v: boolean) => setClassicAnswer(classicCurrentIndex, v)"
          />
          <QuestionFillBlank
            v-else-if="classicCurrentQ.type === 'fill'"
            :question="classicCurrentQ.question"
            :locked="hasSubmittedClassic || isSpectator"
            :allow-change="!hasSubmittedClassic"
            :submitted="classicAnswers[classicCurrentIndex] !== undefined"
            :saved-answer="(classicAnswers[classicCurrentIndex] as string | undefined)"
            @answer="(v: string) => setClassicAnswer(classicCurrentIndex, v)"
          />
          <QuestionInteger
            v-else-if="classicCurrentQ.type === 'integer'"
            :question="classicCurrentQ.question"
            :locked="hasSubmittedClassic || isSpectator"
            :allow-change="!hasSubmittedClassic"
            :saved-answer="(classicAnswers[classicCurrentIndex] as number | undefined)"
            @answer="(v: number) => setClassicAnswer(classicCurrentIndex, v)"
          />
          <QuestionMatch
            v-else-if="classicCurrentQ.type === 'match'"
            :question="classicCurrentQ.question"
            :left="classicCurrentQ.left ?? []"
            :right="classicCurrentQ.right ?? []"
            :locked="hasSubmittedClassic || isSpectator"
            :allow-change="!hasSubmittedClassic"
            @answer="(v: unknown) => setClassicAnswer(classicCurrentIndex, v)"
          />
        </div>

        <!-- Navigation buttons -->
        <div class="classic-nav-buttons">
          <button
            class="btn btn-xl btn-ghost"
            :disabled="classicCurrentIndex === 0"
            @click="classicPrev"
          >
            <i class="la la-arrow-left" /> Previous
          </button>

          <span class="classic-q-counter">{{ classicCurrentIndex + 1 }} / {{ totalQuestions }}</span>

          <button
            v-if="classicCurrentIndex < totalQuestions - 1"
            class="btn btn-xl btn-primary"
            @click="classicNext"
          >
            Next <i class="la la-arrow-right" />
          </button>
          <button
            v-else-if="!hasSubmittedClassic"
            class="btn btn-xl btn-mint"
            :disabled="classicAnsweredCount === 0 || isSpectator"
            @click="submitClassic"
          >
            <i class="la la-paper-plane" /> Submit All
          </button>
        </div>

        <div v-if="hasSubmittedClassic" class="classic-submitted-banner animate__animated animate__bounceIn">
          <i class="la la-check-circle" style="font-size:1.5rem" />
          <div>
            <div style="font-weight:900; font-size:1.1rem">Submitted!</div>
            <div class="text-muted">Score: {{ classicScore }} / {{ totalQuestions * 100 }}</div>
          </div>
        </div>

        <div v-if="submitTotal > 0" class="text-center text-muted mt-2 text-sm">
          {{ submitCount }}/{{ submitTotal }} students submitted
        </div>
      </div>
    </div>

    <!-- ─── LEADERBOARD (between questions) ─── -->
    <div v-else-if="phase === 'leaderboard'" class="page-center">
      <div class="card leaderboard-card animate__animated animate__fadeInUp">
        <div class="leaderboard-header">
          <i class="la la-trophy la-2x" style="color: var(--yellow-dark)" />
          <h2>Leaderboard</h2>
          <span v-if="totalQuestions > 0" class="badge badge-purple">
            After Q{{ currentQIndex + 1 }}/{{ totalQuestions }}
          </span>
        </div>
        <div v-if="myRank" class="my-rank-banner animate__animated animate__bounceIn">
          <i class="la la-user" /> You're ranked <strong>#{{ myRank }}</strong> with {{ myScore.toLocaleString() }} pts
        </div>
        <LeaderboardDisplay :entries="leaderboard" :limit="10" />
        <p class="text-center text-muted text-sm mt-3">
          <i class="la la-clock" /> Waiting for next question...
        </p>
      </div>
    </div>

    <!-- ─── ELIMINATED ─── -->
    <div v-else-if="phase === 'eliminated_spectate'" class="eliminated-screen">
      <div class="eliminated-card animate__animated animate__shakeX">
        <i class="la la-times-circle eliminated-icon" />
        <h2>Eliminated!</h2>
        <p class="mt-2">You got an answer wrong. Spectating the rest...</p>
        <div v-if="leaderboard.length > 0" class="eliminated-lb mt-3">
          <h3><i class="la la-users" /> Remaining Players</h3>
          <LeaderboardDisplay :entries="leaderboard.filter(e => !e.eliminated)" />
        </div>
      </div>
    </div>

    <!-- ─── ENDED ─── -->
    <div v-else-if="phase === 'ended'" class="page-center" style="background: var(--purple-light)">
      <div class="card ended-card animate__animated animate__bounceIn">
        <div class="text-center">
          <i class="la la-trophy la-4x" style="color: var(--yellow-dark)" />
          <h2 class="mt-2">Quiz Complete!</h2>
          <p class="text-muted mt-1">{{ quizTitle }}</p>
        </div>

        <div v-if="myRank" class="my-result-banner mt-3">
          <div class="my-rank-big">
            <i v-if="myRank === 1" class="la la-crown" style="color: var(--yellow-dark)" />
            <span>#{{ myRank }}</span>
          </div>
          <div>
            <div class="font-black text-xl">{{ playerName }}</div>
            <div class="text-muted">{{ myScore.toLocaleString() }} points</div>
          </div>
        </div>

        <div class="mt-3">
          <h3 class="mb-2"><i class="la la-list" /> Final Rankings</h3>
          <LeaderboardDisplay :entries="leaderboard" :limit="20" />
        </div>

        <button class="btn btn-primary btn-xl btn-block mt-3" @click="$router.push('/review')">
          <i class="la la-list-alt" /> Review My Answers
        </button>
        <button class="btn btn-ghost btn-xl btn-block mt-2" @click="$router.push('/')">
          <i class="la la-home" /> Back to Home
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.play-page { min-height: 100vh; background: var(--light); }

.spectator-banner {
  background: var(--yellow-light);
  border-bottom: 3px solid var(--yellow-dark);
  padding: 0.75rem 1.5rem;
  font-weight: 700;
  color: var(--yellow-dark);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Lobby */
.lobby-card {
  max-width: 520px;
  width: 100%;
}
.lobby-icon {
  width: 80px;
  height: 80px;
  background: var(--sky-light);
  border: 3px solid var(--dark);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 4px 4px 0 rgba(30,30,46,0.15);
}
.lobby-waiting {
  font-weight: 700;
  color: var(--mid);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.lobby-players { text-align: left; }

/* Question (blitz/survival) */
.play-question-page { min-height: 100vh; display: flex; flex-direction: column; }
.play-topbar {
  background: var(--white);
  border-bottom: 3px solid var(--dark);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.play-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}
.play-score {
  font-weight: 900;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--purple-dark);
}
.play-timer-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.play-question-body {
  flex: 1;
  padding: 2rem 1.5rem;
}

/* Potential score */
.potential-score {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1.35rem;
  font-weight: 900;
  border: 3px solid currentColor;
  border-radius: 10px;
  padding: 0.3rem 0.75rem;
  transition: color 0.3s, border-color 0.3s;
}
.score-mint  { color: var(--mint-dark); }
.score-yellow { color: var(--yellow-dark); }
.score-coral  { color: var(--coral-dark); }

.answered-badge {
  margin-top: 1.5rem;
  background: var(--mint-light);
  border: 3px solid var(--mint-dark);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  font-weight: 700;
  color: var(--mint-dark);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.missed-badge {
  margin-top: 1.5rem;
  background: var(--coral-light);
  border: 3px solid var(--coral-dark);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  font-weight: 700;
  color: var(--coral-dark);
}
.answer-progress { font-size: 0.9rem; font-weight: 600; color: var(--mid); }
.locked-badge { font-size: 0.95rem; }

/* Classic */
.play-classic-page { min-height: 100vh; background: var(--light); display: flex; flex-direction: column; }

.classic-topbar {
  background: var(--white);
  border-bottom: 3px solid var(--dark);
  padding: 0.75rem 1.5rem;
}
.classic-topbar-inner {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.classic-progress-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.classic-nav-dots {
  background: var(--white);
  border-bottom: 2px solid rgba(30,30,46,0.08);
  padding: 0.75rem 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
}
.nav-dot {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 2px solid var(--dark);
  background: var(--white);
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-dot.answered { background: var(--mint-light); border-color: var(--mint-dark); color: var(--mint-dark); }
.nav-dot.active { background: var(--purple); border-color: var(--purple-dark); color: var(--white); transform: scale(1.1); }
.nav-dot:hover:not(.active) { background: var(--sky-light); }

.classic-single-body {
  flex: 1;
  padding: 1.5rem;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

.classic-nav-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  gap: 1rem;
}
.classic-q-counter {
  font-weight: 800;
  color: var(--mid);
  font-size: 1rem;
}

.classic-submitted-banner {
  margin-top: 1.5rem;
  background: var(--mint-light);
  border: 3px solid var(--mint-dark);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--mint-dark);
}
.classic-question-card { margin-bottom: 1.25rem; }

/* Leaderboard */
.leaderboard-card { max-width: 600px; width: 100%; }
.leaderboard-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.my-rank-banner {
  background: var(--purple-light);
  border: 3px solid var(--purple-dark);
  border-radius: 12px;
  padding: 0.85rem 1.25rem;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Eliminated */
.eliminated-card {
  background: var(--white);
  border: 3px solid var(--coral-dark);
  border-radius: 24px;
  padding: 2.5rem;
  text-align: center;
  max-width: 520px;
  width: 100%;
}
.eliminated-icon { font-size: 5rem; color: var(--coral-dark); }
.eliminated-lb { text-align: left; }

/* Ended */
.ended-card { max-width: 600px; width: 100%; }
.my-result-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--yellow-light);
  border: 3px solid var(--yellow-dark);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}
.my-rank-big {
  font-size: 2.5rem;
  font-weight: 900;
  min-width: 3rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
