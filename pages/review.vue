<script setup lang="ts">
useHead({ title: 'Review Answers — NST Quiz' })

const router = useRouter()

interface ReviewData {
  playerName: string
  quizTitle: string
  mode: string
  score: number
  rank: number | null
  questions: Array<{ index: number; question: any }>
  answers: Record<number, unknown>
  correctAnswers: Record<number, unknown>
  totalPlayers: number
  timestamp: number
}

const review = ref<ReviewData | null>(null)

onMounted(() => {
  const raw = localStorage.getItem('nst-review')
  if (!raw) return
  try {
    review.value = JSON.parse(raw)
  } catch {
    review.value = null
  }
})

function isCorrect(qIndex: number, answer: unknown, correct: unknown): boolean | null {
  if (answer === undefined || answer === null) return null
  if (correct === undefined || correct === null) return null
  const q = review.value?.questions.find(q => q.index === qIndex)?.question
  if (!q) return null
  if (q.type === 'match') {
    const a = answer as number[][]
    const c = correct as number[][]
    if (!Array.isArray(a) || !Array.isArray(c)) return null
    if (a.length !== c.length) return false
    const sortPairs = (pairs: number[][]) =>
      [...pairs].sort((x, y) => x[0] - y[0]).map(p => p.join(','))
    return JSON.stringify(sortPairs(a)) === JSON.stringify(sortPairs(c))
  }
  if (q.type === 'fill') {
    return String(answer).trim().toLowerCase() === String(correct).trim().toLowerCase()
  }
  if (q.type === 'integer') {
    return Number(answer) === Number(correct)
  }
  return JSON.stringify(answer) === JSON.stringify(correct)
}

function correctCount(): number {
  if (!review.value) return 0
  return review.value.questions.filter(({ index }) => {
    const a = review.value!.answers[index]
    const c = review.value!.correctAnswers[index]
    return isCorrect(index, a, c) === true
  }).length
}

function typeBadgeClass(type: string): string {
  return { mcq: 'badge-purple', 'true-false': 'badge-sky', fill: 'badge-mint', integer: 'badge-yellow', match: 'badge-coral' }[type] ?? 'badge-dark'
}

function typeLabel(type: string): string {
  return { mcq: 'MCQ', 'true-false': 'True/False', fill: 'Fill-in', integer: 'Integer', match: 'Match' }[type] ?? type
}

function typeIcon(type: string): string {
  return { mcq: 'la-list-ul', 'true-false': 'la-check-square', fill: 'la-keyboard', integer: 'la-hashtag', match: 'la-random' }[type] ?? 'la-question'
}

function formatAnswer(answer: unknown, question: any): string {
  if (answer === undefined || answer === null) return '—'
  if (question.type === 'mcq') {
    const idx = answer as number
    return question.options?.[idx] !== undefined ? `${['A','B','C','D','E'][idx]}. ${question.options[idx]}` : String(answer)
  }
  if (question.type === 'true-false') return answer ? 'True' : 'False'
  if (question.type === 'match') {
    if (!Array.isArray(answer)) return String(answer)
    return (answer as number[][]).map(([l, r]) => `${question.left?.[l] ?? l} → ${question.right?.[r] ?? r}`).join(', ')
  }
  return String(answer)
}
</script>

<template>
  <div class="review-page">
    <div class="review-header page-header">
      <div class="container flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm" @click="router.push('/')">
            <i class="la la-arrow-left" /> Home
          </button>
          <h2 class="font-black" style="font-size:1.1rem">
            <i class="la la-list-alt" /> Answer Review
          </h2>
        </div>
        <div v-if="review" class="review-header-meta">
          <span class="badge badge-purple">
            <i class="la la-user" /> {{ review.playerName }}
          </span>
          <span v-if="review.rank" class="badge badge-yellow">
            <i class="la la-trophy" /> Rank #{{ review.rank }} of {{ review.totalPlayers }}
          </span>
          <span class="badge badge-mint">
            <i class="la la-star" /> {{ review.score.toLocaleString() }} pts
          </span>
        </div>
      </div>
    </div>

    <!-- No data -->
    <div v-if="!review" class="page-center">
      <div class="card no-data-card animate__animated animate__bounceIn">
        <div class="text-center">
          <i class="la la-exclamation-circle la-3x" style="color: var(--coral-dark)" />
          <h2 class="mt-2">No Review Data</h2>
          <p class="text-muted mt-2">Complete a quiz first to see your answers here.</p>
          <button class="btn btn-primary btn-xl mt-3" @click="router.push('/')">
            <i class="la la-home" /> Back to Home
          </button>
        </div>
      </div>
    </div>

    <!-- Review content -->
    <div v-else class="container review-body">
      <!-- Summary card -->
      <div class="card summary-card animate__animated animate__fadeInDown mb-3">
        <div class="summary-title-row">
          <i class="la la-book" />
          <span class="summary-title-text">{{ review.quizTitle }}</span>
        </div>
        <div class="summary-stats-row">
          <div class="summary-item">
            <div class="summary-value">
              <span :class="`badge badge-${review.mode === 'classic' ? 'sky' : review.mode === 'blitz' ? 'yellow' : 'coral'}`" style="font-size:1rem">
                <i :class="`la la-${review.mode === 'classic' ? 'graduation-cap' : review.mode === 'blitz' ? 'bolt' : 'shield-alt'}`" />
                {{ review.mode.charAt(0).toUpperCase() + review.mode.slice(1) }}
              </span>
            </div>
            <div class="summary-label"><i class="la la-gamepad" /> Mode</div>
          </div>
          <div class="summary-item">
            <div class="summary-value score-display">{{ correctCount() }}/{{ review.questions.length }}</div>
            <div class="summary-label"><i class="la la-check-circle" /> Correct</div>
          </div>
          <div class="summary-item">
            <div class="summary-value score-display">{{ review.score.toLocaleString() }}</div>
            <div class="summary-label"><i class="la la-star" /> Score</div>
          </div>
        </div>
      </div>

      <!-- Question cards -->
      <div
        v-for="{ index, question } in review.questions"
        :key="index"
        class="card question-review-card animate__animated animate__fadeIn mb-3"
        :class="{
          'card-correct': isCorrect(index, review.answers[index], review.correctAnswers[index]) === true,
          'card-wrong': isCorrect(index, review.answers[index], review.correctAnswers[index]) === false,
          'card-skipped': review.answers[index] === undefined || review.answers[index] === null,
        }"
        :style="{ animationDelay: `${index * 0.04}s` }"
      >
        <!-- Card header -->
        <div class="qr-header">
          <div class="flex items-center gap-2">
            <span class="qr-number">Q{{ index + 1 }}</span>
            <span class="badge" :class="typeBadgeClass(question.type)">
              <i :class="`la ${typeIcon(question.type)}`" />
              {{ typeLabel(question.type) }}
            </span>
          </div>
          <div class="qr-result-badge">
            <span
              v-if="isCorrect(index, review.answers[index], review.correctAnswers[index]) === true"
              class="badge badge-mint"
            >
              <i class="la la-check-circle" /> Correct
            </span>
            <span
              v-else-if="isCorrect(index, review.answers[index], review.correctAnswers[index]) === false"
              class="badge badge-coral"
            >
              <i class="la la-times-circle" /> Incorrect
            </span>
            <span v-else class="badge badge-dark">
              <i class="la la-clock" /> Not answered
            </span>
          </div>
        </div>

        <!-- Question text -->
        <div class="qr-question">{{ question.question }}</div>

        <!-- MCQ options -->
        <div v-if="question.type === 'mcq'" class="qr-options">
          <div
            v-for="(opt, i) in question.options"
            :key="i"
            class="qr-option"
            :class="{
              'option-correct': i === review.correctAnswers[index],
              'option-wrong': i === review.answers[index] && i !== review.correctAnswers[index],
              'option-neutral': i !== review.correctAnswers[index] && i !== review.answers[index],
            }"
          >
            <span class="option-letter">{{ ['A','B','C','D','E'][i] }}</span>
            <span>{{ opt }}</span>
            <i v-if="i === review.correctAnswers[index]" class="la la-check-circle ml-auto option-icon-correct" />
            <i v-else-if="i === review.answers[index]" class="la la-times-circle ml-auto option-icon-wrong" />
          </div>
        </div>

        <!-- True/False -->
        <div v-else-if="question.type === 'true-false'" class="qr-tf-row">
          <div
            class="qr-tf-btn"
            :class="{
              'tf-correct': review.correctAnswers[index] === true,
              'tf-wrong': review.answers[index] === true && review.correctAnswers[index] !== true,
              'tf-neutral': review.answers[index] !== true && review.correctAnswers[index] !== true,
            }"
          >
            <i class="la la-check" /> True
            <i v-if="review.correctAnswers[index] === true" class="la la-check-circle ml-auto" />
            <i v-else-if="review.answers[index] === true" class="la la-times-circle ml-auto" />
          </div>
          <div
            class="qr-tf-btn"
            :class="{
              'tf-correct': review.correctAnswers[index] === false,
              'tf-wrong': review.answers[index] === false && review.correctAnswers[index] !== false,
              'tf-neutral': review.answers[index] !== false && review.correctAnswers[index] !== false,
            }"
          >
            <i class="la la-times" /> False
            <i v-if="review.correctAnswers[index] === false" class="la la-check-circle ml-auto" />
            <i v-else-if="review.answers[index] === false" class="la la-times-circle ml-auto" />
          </div>
        </div>

        <!-- Fill / Integer -->
        <div v-else-if="question.type === 'fill' || question.type === 'integer'" class="qr-text-compare">
          <div class="qr-answer-box" :class="isCorrect(index, review.answers[index], review.correctAnswers[index]) === true ? 'box-correct' : 'box-wrong'">
            <div class="qr-answer-label"><i class="la la-user" /> Your answer</div>
            <div class="qr-answer-val">
              {{ review.answers[index] !== undefined && review.answers[index] !== null ? String(review.answers[index]) : '—' }}
            </div>
          </div>
          <div v-if="review.correctAnswers[index] !== undefined" class="qr-answer-box box-correct">
            <div class="qr-answer-label"><i class="la la-check-circle" /> Correct answer</div>
            <div class="qr-answer-val">{{ String(review.correctAnswers[index]) }}</div>
          </div>
        </div>

        <!-- Match -->
        <div v-else-if="question.type === 'match'" class="qr-match">
          <div class="qr-answer-box" :class="isCorrect(index, review.answers[index], review.correctAnswers[index]) === true ? 'box-correct' : 'box-wrong'">
            <div class="qr-answer-label"><i class="la la-user" /> Your pairs</div>
            <div v-if="review.answers[index] && Array.isArray(review.answers[index])">
              <div
                v-for="([l, r], pi) in (review.answers[index] as number[][])"
                :key="pi"
                class="match-pair"
              >
                <span>{{ question.left?.[l] ?? l }}</span>
                <i class="la la-arrow-right" />
                <span>{{ question.right?.[r] ?? r }}</span>
              </div>
            </div>
            <div v-else class="text-muted">—</div>
          </div>
          <div v-if="review.correctAnswers[index]" class="qr-answer-box box-correct">
            <div class="qr-answer-label"><i class="la la-check-circle" /> Correct pairs</div>
            <div
              v-for="([l, r], pi) in (review.correctAnswers[index] as number[][])"
              :key="pi"
              class="match-pair"
            >
              <span>{{ question.left?.[l] ?? l }}</span>
              <i class="la la-arrow-right" />
              <span>{{ question.right?.[r] ?? r }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Back button -->
      <div class="text-center mt-3 mb-4">
        <button class="btn btn-primary btn-xl" @click="router.push('/')">
          <i class="la la-home" /> Back to Home
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-page { min-height: 100vh; background: var(--light); }

.review-header { position: sticky; top: 0; z-index: 100; }
.review-header-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.review-body {
  padding-top: 1.5rem;
  padding-bottom: 2rem;
  max-width: 720px;
  margin: 0 auto;
}

.no-data-card { max-width: 440px; width: 100%; }

/* Summary */
.summary-card { padding: 1.25rem 1.5rem; }
.summary-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 900;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--border-color, rgba(30,30,46,0.1));
  padding-bottom: 0.75rem;
  color: var(--dark);
}
.summary-title-text { flex: 1; }
.summary-stats-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
}
.summary-item { flex: 1; min-width: 100px; }
.summary-value { font-size: 1.1rem; font-weight: 900; margin-bottom: 0.25rem; }
.summary-label { font-size: 0.85rem; color: var(--mid); font-weight: 600; display: flex; align-items: center; gap: 0.3rem; }
.score-display { color: var(--purple-dark); }

/* Question review card */
.question-review-card {
  border-left: 6px solid var(--mid);
  transition: border-color 0.2s;
}
.card-correct { border-left-color: var(--mint-dark); }
.card-wrong { border-left-color: var(--coral-dark); }
.card-skipped { border-left-color: var(--mid); opacity: 0.8; }

.qr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.qr-number {
  font-weight: 900;
  font-size: 1rem;
  color: var(--mid);
}
.qr-question {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.4;
}

/* MCQ options */
.qr-options { display: flex; flex-direction: column; gap: 0.5rem; }
.qr-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 2px solid var(--border-color, rgba(30,30,46,0.15));
  font-weight: 600;
  font-size: 0.95rem;
}
.option-correct {
  background: var(--mint-light);
  border-color: var(--mint-dark);
  color: var(--mint-dark);
}
.option-wrong {
  background: var(--coral-light);
  border-color: var(--coral-dark);
  color: var(--coral-dark);
}
.option-neutral { background: var(--white); }
.option-letter {
  background: rgba(30,30,46,0.08);
  border-radius: 6px;
  padding: 0.15rem 0.5rem;
  font-weight: 800;
  font-size: 0.85rem;
  min-width: 24px;
  text-align: center;
}
.option-icon-correct { color: var(--mint-dark); }
.option-icon-wrong { color: var(--coral-dark); }
.ml-auto { margin-left: auto; }

/* True/False */
.qr-tf-row {
  display: flex;
  gap: 0.75rem;
}
.qr-tf-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 2px solid rgba(30,30,46,0.15);
  font-weight: 700;
}
.tf-correct { background: var(--mint-light); border-color: var(--mint-dark); color: var(--mint-dark); }
.tf-wrong { background: var(--coral-light); border-color: var(--coral-dark); color: var(--coral-dark); }
.tf-neutral { background: var(--white); }

/* Fill / Integer / Match answer boxes */
.qr-text-compare, .qr-match {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.qr-answer-box {
  flex: 1;
  min-width: 160px;
  border-radius: 10px;
  border: 2px solid rgba(30,30,46,0.15);
  padding: 0.75rem 1rem;
  background: var(--white);
}
.box-correct { background: var(--mint-light); border-color: var(--mint-dark); }
.box-wrong { background: var(--coral-light); border-color: var(--coral-dark); }
.qr-answer-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--mid);
  margin-bottom: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.qr-answer-val { font-size: 1.05rem; font-weight: 800; }

/* Match pairs */
.match-pair {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
</style>
