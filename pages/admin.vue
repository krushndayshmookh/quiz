<script setup lang="ts">
useHead({ title: 'Admin — NST Quiz' })

const { connect, disconnect, on, off, emit } = useSocket()

// ─── Auth ─────────────────────────────────────────────────────────────────────
const authenticated = ref(false)
const password = ref('')
const adminToken = ref<string | null>(null) // for REST results/CSV
const loginError = ref('')
const loginLoading = ref(false)

// ─── Quiz state ───────────────────────────────────────────────────────────────
interface QuizData {
  quiz: any
  phase: string
  currentQuestionIndex: number
  timerRemaining: number
  questionLocked: boolean
  players: any[]
  playerCount: number
}

const quizData = ref<QuizData | null>(null)

// ─── Upload ───────────────────────────────────────────────────────────────────
const uploadError = ref('')
const uploadSuccess = ref('')
const uploading = ref(false)

// ─── Controls ─────────────────────────────────────────────────────────────────
const controlError = ref('')

// ─── Results ──────────────────────────────────────────────────────────────────
const results = ref<any>(null)
const showResults = ref(false)
const showAnswers = ref(false)

// ─── Socket setup ─────────────────────────────────────────────────────────────
function handleAdminState(data: QuizData) {
  quizData.value = data
}

function handleAdminError(data: { message: string }) {
  controlError.value = data.message
  loginError.value = data.message
  loginLoading.value = false
  uploading.value = false
}

function handleAuthenticated(data: { token: string }) {
  authenticated.value = true
  adminToken.value = data.token
  sessionStorage.setItem('nst-admin-pw', password.value)
  loginError.value = ''
  loginLoading.value = false
}

function handleQuizLoaded(data: { title: string; mode: string; questionCount: number }) {
  uploadSuccess.value = `Loaded: "${data.title}" — ${data.questionCount} questions (${data.mode})`
  uploading.value = false
  uploadError.value = ''
}

onMounted(async () => {
  await connect()
  on('admin:state', handleAdminState)
  on('admin:authenticated', handleAuthenticated)
  on('admin:error', handleAdminError)
  on('admin:quizLoaded', handleQuizLoaded)

  // Auto-login if password saved in session
  const saved = sessionStorage.getItem('nst-admin-pw')
  if (saved) {
    password.value = saved
    loginLoading.value = true
    // Socket is connected (connect() awaited above), safe to emit
    emit('admin:login', { password: saved })
  }
})

onUnmounted(() => {
  off('admin:state', handleAdminState)
  off('admin:authenticated', handleAuthenticated)
  off('admin:error', handleAdminError)
  off('admin:quizLoaded', handleQuizLoaded)
})

async function login() {
  loginError.value = ''
  loginLoading.value = true
  emit('admin:login', { password: password.value })
}

function logout() {
  authenticated.value = false
  adminToken.value = null
  quizData.value = null
  sessionStorage.removeItem('nst-admin-pw')
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const json = JSON.parse(ev.target?.result as string)
      uploadQuiz(json)
    } catch {
      uploadError.value = 'Invalid JSON file'
    }
  }
  reader.readAsText(file)
}

function uploadQuiz(json: object) {
  uploading.value = true
  uploadError.value = ''
  uploadSuccess.value = ''
  emit('admin:upload', json)
}

// ─── Controls ─────────────────────────────────────────────────────────────────
const controlLoading = ref(false)

function sendControl(action: string) {
  controlError.value = ''
  emit(`admin:${action}`)
}

// ─── Results (REST — needs token) ────────────────────────────────────────────
async function loadResults() {
  if (!adminToken.value) return
  try {
    const data = await $fetch<any>('/api/admin/results', {
      headers: { authorization: `Bearer ${adminToken.value}` },
    })
    results.value = data
    showResults.value = true
  } catch (e: any) {
    controlError.value = e?.data?.message ?? 'Failed to load results'
  }
}

function downloadCSV() {
  if (!adminToken.value) return
  const url = `/api/admin/results?format=csv`
  fetch(url, { headers: { authorization: `Bearer ${adminToken.value}` } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.setAttribute('download', 'quiz-results.csv')
      a.click()
      URL.revokeObjectURL(blobUrl)
    })
}

// ─── Computed helpers ─────────────────────────────────────────────────────────
const phase = computed(() => quizData.value?.phase ?? 'idle')
const currentQ = computed(() => {
  if (!quizData.value?.quiz || quizData.value.currentQuestionIndex < 0) return null
  return quizData.value.quiz.questions?.[quizData.value.currentQuestionIndex]
})
const qIndex = computed(() => quizData.value?.currentQuestionIndex ?? -1)
const totalQ = computed(() => quizData.value?.quiz?.questions?.length ?? 0)

function answerLabel(q: any, answer: unknown): string {
  if (answer === null || answer === undefined) return '—'
  switch (q?.type) {
    case 'mcq': return q.options?.[answer as number] ?? String(answer)
    case 'true-false': return answer ? 'True' : 'False'
    case 'match': return JSON.stringify(answer)
    default: return String(answer)
  }
}

function getAnswerBreakdown(qIdx: number) {
  if (!quizData.value?.players) return []
  return quizData.value.players.map(p => ({
    name: p.name,
    answer: p.answers?.[qIdx],
    correct: p.answers?.[qIdx]?.correct,
    value: p.answers?.[qIdx]?.answer,
  }))
}
</script>

<template>
  <div class="admin-page">
    <!-- ─── LOGIN ─── -->
    <div v-if="!authenticated" class="page-center">
      <div class="card login-card animate__animated animate__bounceIn">
        <div class="text-center mb-3">
          <div class="admin-logo">
            <i class="la la-cog la-2x" />
          </div>
          <h2 class="mt-2">Admin Login</h2>
          <p class="text-muted text-sm mt-1">NST Quiz Dashboard</p>
        </div>
        <input
          v-model="password"
          type="password"
          class="input input-xl"
          placeholder="Admin password"
          @keydown.enter="login"
        />
        <p v-if="loginError" class="login-error animate__animated animate__shakeX">
          <i class="la la-exclamation-circle" /> {{ loginError }}
        </p>
        <button class="btn btn-xl btn-dark btn-block mt-3" :disabled="loginLoading" @click="login">
          <i v-if="!loginLoading" class="la la-sign-in-alt" />
          <i v-else class="la la-spinner la-spin" />
          {{ loginLoading ? 'Logging in...' : 'Login' }}
        </button>
      </div>
    </div>

    <!-- ─── DASHBOARD ─── -->
    <div v-else-if="authenticated" class="admin-dashboard">
      <!-- Header -->
      <div class="admin-header">
        <div class="container flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="admin-logo-sm"><i class="la la-bolt" /></div>
            <h2 class="font-black">NST Quiz Admin</h2>
            <span class="badge" :class="`badge-${phase === 'idle' ? 'dark' : phase === 'lobby' ? 'sky' : phase === 'question' ? 'yellow' : phase === 'leaderboard' ? 'purple' : phase === 'ended' ? 'mint' : 'dark'}`">
              <i :class="`la la-${phase === 'idle' ? 'circle' : phase === 'lobby' ? 'users' : phase === 'question' ? 'play-circle' : phase === 'leaderboard' ? 'trophy' : 'flag-checkered'}`" />
              {{ phase }}
            </span>
          </div>
          <button class="btn btn-ghost btn-sm" @click="logout">
            <i class="la la-sign-out-alt" /> Logout
          </button>
        </div>
      </div>

      <div class="container admin-grid" style="padding-top: 1.5rem; padding-bottom: 2rem">
        <!-- ─── MAIN COLUMN ─── -->
        <div>
          <!-- Error banner -->
          <div v-if="controlError" class="error-banner animate__animated animate__shakeX mb-3">
            <i class="la la-exclamation-circle" /> {{ controlError }}
            <button class="btn btn-sm btn-ghost" style="margin-left:auto" @click="controlError = ''">
              <i class="la la-times" />
            </button>
          </div>

          <!-- ─── Upload Card ─── -->
          <div v-if="phase === 'idle'" class="card mb-3 animate__animated animate__fadeIn">
            <h3 class="mb-2"><i class="la la-upload" /> Upload Quiz</h3>
            <p class="text-muted text-sm mb-2">Upload a JSON quiz file to start. See sample files in /quiz-samples/</p>

            <label class="upload-area">
              <input type="file" accept=".json" class="hidden" @change="handleFile" />
              <i class="la la-file-code la-3x" />
              <span>Click to select quiz JSON</span>
              <span class="text-sm text-muted">or drag and drop</span>
            </label>

            <div v-if="uploadSuccess" class="upload-success mt-2 animate__animated animate__fadeIn">
              <i class="la la-check-circle" /> {{ uploadSuccess }}
            </div>
            <div v-if="uploadError" class="upload-error mt-2 animate__animated animate__shakeX">
              <i class="la la-exclamation-circle" /> {{ uploadError }}
            </div>
            <div v-if="uploading" class="mt-2 text-muted">
              <i class="la la-spinner la-spin" /> Uploading...
            </div>
          </div>

          <!-- ─── Quiz Info Card ─── -->
          <div v-if="quizData?.quiz" class="card mb-3 animate__animated animate__fadeIn">
            <div class="quiz-info-header">
              <div>
                <h3>{{ quizData.quiz.title }}</h3>
                <div class="flex gap-1 mt-1" style="flex-wrap: wrap">
                  <span class="badge" :class="`badge-${quizData.quiz.mode === 'classic' ? 'sky' : quizData.quiz.mode === 'blitz' ? 'yellow' : 'coral'}`">
                    <i :class="`la la-${quizData.quiz.mode === 'classic' ? 'graduation-cap' : quizData.quiz.mode === 'blitz' ? 'bolt' : 'shield-alt'}`" />
                    {{ quizData.quiz.mode }}
                  </span>
                  <span class="badge badge-purple">
                    <i class="la la-list" /> {{ totalQ }} questions
                  </span>
                  <span v-if="quizData.quiz.timePerQuestion" class="badge badge-yellow">
                    <i class="la la-clock" /> {{ quizData.quiz.timePerQuestion }}s
                  </span>
                </div>
              </div>
              <span class="badge badge-dark">{{ quizData.playerCount }} players</span>
            </div>
          </div>

          <!-- ─── Controls Card ─── -->
          <div v-if="quizData?.quiz" class="card mb-3 animate__animated animate__fadeIn">
            <h3 class="mb-3"><i class="la la-gamepad" /> Controls</h3>
            <div class="control-grid">
              <!-- Start -->
              <button
                v-if="phase === 'lobby'"
                class="btn btn-xl btn-mint"
                :disabled="controlLoading"
                @click="sendControl('start')"
              >
                <i class="la la-play-circle" /> Start Quiz
              </button>

              <!-- Next (blitz/survival) -->
              <button
                v-if="(phase === 'question' || phase === 'leaderboard') && quizData?.quiz?.mode !== 'classic'"
                class="btn btn-xl btn-sky"
                :disabled="controlLoading"
                @click="sendControl('next')"
              >
                <i class="la la-step-forward" />
                {{ phase === 'question' ? 'Lock & Score' : (qIndex + 1 >= totalQ ? 'End Quiz & Show Results' : `Next Q (${qIndex + 2}/${totalQ})`) }}
              </button>

              <!-- End quiz -->
              <button
                v-if="phase === 'question' || phase === 'leaderboard'"
                class="btn btn-xl btn-danger"
                :disabled="controlLoading"
                @click="sendControl('end')"
              >
                <i class="la la-stop-circle" /> End Quiz
              </button>

              <!-- Results / Download -->
              <button
                v-if="phase === 'ended' || phase === 'question' || phase === 'leaderboard'"
                class="btn btn-xl btn-yellow"
                @click="loadResults"
              >
                <i class="la la-chart-bar" /> View Results
              </button>
              <button
                v-if="phase === 'ended' || phase === 'question' || phase === 'leaderboard'"
                class="btn btn-xl btn-primary"
                @click="downloadCSV"
              >
                <i class="la la-download" /> Download CSV
              </button>

              <!-- Reset -->
              <button
                v-if="phase !== 'idle'"
                class="btn btn-ghost btn-sm"
                :disabled="controlLoading"
                @click="sendControl('reset')"
              >
                <i class="la la-redo" /> Reset Quiz
              </button>
            </div>
          </div>

          <!-- ─── Current Question Card ─── -->
          <div v-if="currentQ && (phase === 'question' || phase === 'leaderboard')" class="card mb-3 animate__animated animate__fadeIn">
            <div class="flex items-center justify-between mb-2">
              <h3>
                <i class="la la-question-circle" /> Q{{ qIndex + 1 }}/{{ totalQ }}
                <span v-if="quizData?.questionLocked" class="badge badge-dark ml-1">
                  <i class="la la-lock" /> Locked
                </span>
              </h3>
              <div v-if="phase === 'question' && quizData?.quiz?.mode !== 'classic'" class="timer-display-admin">
                <i class="la la-clock" />
                <span>{{ quizData?.timerRemaining ?? 0 }}s</span>
              </div>
            </div>

            <p class="question-text" style="font-size: 1.2rem">{{ currentQ.question }}</p>

            <!-- Show correct answer to admin -->
            <div class="answer-key mt-2">
              <strong><i class="la la-key" /> Answer: </strong>
              <span class="answer-reveal">
                <template v-if="currentQ.type === 'mcq'">
                  {{ currentQ.options?.[currentQ.answer] ?? currentQ.answer }} (option {{ currentQ.answer }})
                </template>
                <template v-else-if="currentQ.type === 'true-false'">
                  {{ currentQ.answer ? 'True' : 'False' }}
                </template>
                <template v-else-if="currentQ.type === 'match'">
                  {{ currentQ.left?.map((l: string, i: number) => `${l} → ${currentQ.right?.[currentQ.answer?.[i]?.[1]] ?? '?'}`)?.join(' | ') }}
                </template>
                <template v-else>
                  {{ currentQ.answer }}
                </template>
              </span>
            </div>

            <!-- Response breakdown -->
            <div v-if="quizData?.quiz?.mode !== 'classic'" class="response-breakdown mt-3">
              <div class="flex items-center justify-between mb-1">
                <strong class="text-sm"><i class="la la-poll" /> Responses</strong>
                <span class="text-sm text-muted">
                  {{ getAnswerBreakdown(qIndex).filter(p => p.value !== undefined).length }}/{{ quizData?.playerCount ?? 0 }}
                </span>
              </div>
              <div class="response-list">
                <div
                  v-for="p in getAnswerBreakdown(qIndex)"
                  :key="p.name"
                  class="response-row"
                  :class="{ 'resp-correct': p.correct, 'resp-wrong': p.value !== undefined && !p.correct }"
                >
                  <i :class="`la la-${p.value !== undefined ? (p.correct ? 'check-circle' : 'times-circle') : 'minus-circle'}`" />
                  <span class="flex-1">{{ p.name }}</span>
                  <span class="text-sm">{{ answerLabel(currentQ, p.value) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Results Panel ─── -->
          <div v-if="showResults && results" class="card animate__animated animate__fadeIn">
            <div class="flex items-center justify-between mb-3">
              <h3><i class="la la-chart-bar" /> Results</h3>
              <div class="flex gap-1">
                <label class="toggle-label">
                  <input v-model="showAnswers" type="checkbox" />
                  Show answers
                </label>
                <button class="btn btn-sm btn-ghost" @click="showResults = false">
                  <i class="la la-times" />
                </button>
              </div>
            </div>
            <table class="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th v-for="(q, qi) in results.questions" :key="qi">Q{{ qi + 1 }}</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in results.results" :key="r.name">
                  <td>{{ r.rank }}</td>
                  <td>{{ r.name }}</td>
                  <td v-for="(q, qi) in r.questions" :key="qi" :class="q.correct ? 'td-correct' : 'td-wrong'">
                    <i :class="`la la-${q.correct ? 'check' : 'times'}`" />
                    <span v-if="showAnswers" class="text-sm"> {{ answerLabel(results.questions[qi], q.answer) }}</span>
                  </td>
                  <td><strong>{{ r.score }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ─── SIDEBAR ─── -->
        <div>
          <!-- Players -->
          <div class="card mb-3 animate__animated animate__fadeIn">
            <div class="flex items-center justify-between mb-2">
              <h3><i class="la la-users" /> Players</h3>
              <span class="badge badge-purple">{{ quizData?.playerCount ?? 0 }}</span>
            </div>
            <PlayerList
              :players="quizData?.players ?? []"
              :show-score="phase !== 'lobby'"
            />
          </div>

          <!-- Leaderboard in sidebar (when available) -->
          <div v-if="phase === 'leaderboard' || phase === 'ended'" class="card animate__animated animate__fadeIn">
            <h3 class="mb-2"><i class="la la-trophy" /> Leaderboard</h3>
            <NuxtLink to="/leaderboard" target="_blank" class="btn btn-sm btn-yellow btn-block mb-2">
              <i class="la la-external-link-alt" /> Open Projector View
            </NuxtLink>
            <LeaderboardDisplay
              :entries="(quizData?.players ?? []).sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => ({ ...p, rank: i + 1 }))"
              :limit="10"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { min-height: 100vh; background: var(--light); }

.admin-header {
  background: var(--white);
  border-bottom: 3px solid var(--dark);
  padding: 0.85rem 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.admin-logo {
  width: 64px;
  height: 64px;
  background: var(--yellow);
  border: 3px solid var(--dark);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.admin-logo-sm {
  width: 36px;
  height: 36px;
  background: var(--yellow);
  border: 2px solid var(--dark);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 900;
}

.login-card { max-width: 400px; width: 100%; }
.login-error { color: var(--coral-dark); font-weight: 700; margin-top: 0.5rem; font-size: 0.9rem; }

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 3px dashed rgba(30,30,46,0.3);
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  color: var(--mid);
  font-weight: 700;
  transition: border-color 0.15s, background 0.15s;
}
.upload-area:hover { border-color: var(--purple); background: var(--purple-light); }

.upload-success { color: var(--mint-dark); font-weight: 700; }
.upload-error { color: var(--coral-dark); font-weight: 700; }

.quiz-info-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }

.control-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }

.answer-key {
  background: var(--yellow-light);
  border: 2px solid var(--yellow-dark);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
}
.answer-reveal { font-weight: 900; margin-left: 0.35rem; }

.timer-display-admin {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--coral-dark);
  border: 2px solid var(--coral);
  border-radius: 8px;
  padding: 0.2rem 0.6rem;
}

.response-list { display: flex; flex-direction: column; gap: 0.35rem; max-height: 300px; overflow-y: auto; }
.response-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--light);
}
.resp-correct { background: var(--mint-light); color: var(--mint-dark); }
.resp-wrong   { background: var(--coral-light); color: var(--coral-dark); }

.error-banner {
  background: var(--coral-light);
  border: 3px solid var(--coral-dark);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  color: var(--coral-dark);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ml-1 { margin-left: 0.35rem; }

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.results-table th, .results-table td {
  border: 2px solid rgba(30,30,46,0.15);
  padding: 0.5rem 0.75rem;
  text-align: center;
}
.results-table th { background: var(--light); font-weight: 700; }
.td-correct { background: var(--mint-light); color: var(--mint-dark); }
.td-wrong   { background: var(--coral-light); color: var(--coral-dark); }

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
