<script setup lang="ts">
import type { LeaderboardEntry } from '~/composables/useQuiz'

useHead({ title: 'Leaderboard — NST Quiz' })

const { connect, on, off } = useSocket()
const { fireConfetti, fireSideConfetti } = useConfetti()

const leaderboard = ref<LeaderboardEntry[]>([])
const phase = ref('idle')
const mode = ref<string | null>(null)
const title = ref('')
const questionIndex = ref(-1)
const totalQuestions = ref(0)
const timerRemaining = ref(0)
const quizEnded = ref(false)

// Track previous ranks for animation
const prevRanks = ref<Record<string, number>>({})
const players = ref<any[]>([])

onMounted(async () => {
  await connect()

  on('connect', () => {
    // Join as spectator so we receive broadcasts
    const { emit: socketEmit } = useSocket()
    socketEmit('spectator:join')
    // Fetch current state on connect
    $fetch('/api/quiz/current').then((data: any) => {
      phase.value = data.phase
      mode.value = data.mode ?? null
      title.value = data.title ?? ''
      totalQuestions.value = data.total ?? 0
      if (data.leaderboard) leaderboard.value = data.leaderboard
    }).catch(() => {})
  })

  on('quiz:loaded', (data: any) => {
    title.value = data.title
    mode.value = data.mode
    phase.value = 'lobby'
    quizEnded.value = false
    leaderboard.value = []
  })

  on('quiz:started', (data: any) => {
    mode.value = data.mode
    title.value = data.title
    phase.value = 'question'
  })

  on('quiz:question', (data: any) => {
    questionIndex.value = data.index
    totalQuestions.value = data.total
    timerRemaining.value = data.timer
    phase.value = 'question'
  })

  on('quiz:timer', (data: any) => {
    timerRemaining.value = data.remaining
  })

  on('quiz:leaderboard', async (data: any) => {
    // Save previous ranks
    const prev: Record<string, number> = {}
    for (const e of leaderboard.value) prev[e.name] = e.rank
    prevRanks.value = prev

    questionIndex.value = data.questionIndex
    leaderboard.value = data.leaderboard
    phase.value = 'leaderboard'
  })

  on('quiz:ended', async (data: any) => {
    leaderboard.value = data.leaderboard ?? []
    phase.value = 'ended'
    quizEnded.value = true
    title.value = data.title ?? title.value
    await nextTick()
    await fireConfetti({ top3: true })
    setTimeout(() => fireSideConfetti(), 600)
  })

  on('quiz:reset', () => {
    leaderboard.value = []
    phase.value = 'idle'
    quizEnded.value = false
    title.value = ''
    mode.value = null
  })

  on('players:updated', (data: any) => { players.value = data.players })

  // Try initial connect event
  $fetch('/api/quiz/current').then((data: any) => {
    phase.value = data.phase
    mode.value = data.mode ?? null
    title.value = data.title ?? ''
    totalQuestions.value = data.total ?? 0
    if (data.leaderboard) leaderboard.value = data.leaderboard
  }).catch(() => {})
})

onUnmounted(() => {
  off('connect')
  off('quiz:loaded')
  off('quiz:started')
  off('quiz:question')
  off('quiz:timer')
  off('quiz:leaderboard')
  off('quiz:ended')
  off('quiz:reset')
  off('players:updated')
})

function rankDelta(entry: LeaderboardEntry): number {
  const prev = prevRanks.value[entry.name]
  if (prev === undefined) return 0
  return prev - entry.rank // positive = moved up
}

const top3 = computed(() => leaderboard.value.filter(e => e.rank <= 3))
const rest = computed(() => leaderboard.value.filter(e => e.rank > 3))
</script>

<template>
  <div class="lb-page projector-mode">
    <!-- Header -->
    <div class="lb-header">
      <div class="lb-header-inner">
        <div class="lb-title-area">
          <i class="la la-trophy lb-trophy-icon" />
          <div>
            <h1 class="lb-main-title">{{ title || 'NST Quiz' }}</h1>
            <div v-if="mode" class="lb-meta">
              <span class="badge" :class="`badge-${mode === 'classic' ? 'sky' : mode === 'blitz' ? 'yellow' : 'coral'}`">
                <i :class="`la la-${mode === 'classic' ? 'graduation-cap' : mode === 'blitz' ? 'bolt' : 'shield-alt'}`" />
                {{ mode.charAt(0).toUpperCase() + mode.slice(1) }} Mode
              </span>
              <span v-if="questionIndex >= 0 && totalQuestions > 0 && phase !== 'ended'" class="badge badge-purple">
                <i class="la la-question-circle" /> Q{{ questionIndex + 1 }}/{{ totalQuestions }}
              </span>
              <span v-if="quizEnded" class="badge badge-mint">
                <i class="la la-flag-checkered" /> Final Results
              </span>
            </div>
          </div>
        </div>
        <div v-if="phase === 'question' && timerRemaining > 0" class="lb-live-timer">
          <Timer :remaining="timerRemaining" :max="30" />
        </div>
        <NuxtLink to="/" class="btn btn-sm btn-ghost lb-join-link">
          <i class="la la-sign-in-alt" /> Join
        </NuxtLink>
      </div>
    </div>

    <!-- Empty / idle -->
    <div v-if="leaderboard.length === 0" class="lb-empty">
      <div class="lb-empty-inner">
        <i class="la la-clock la-4x" style="color: var(--purple)" />
        <h2 class="mt-3">
          {{ phase === 'idle' ? 'No quiz loaded' : 'Waiting for results...' }}
        </h2>
        <p class="text-muted mt-1">
          {{ phase === 'idle' ? 'Admin will load a quiz soon.' : 'Leaderboard will appear after the first question.' }}
        </p>
        <div v-if="players.length > 0" class="mt-3">
          <span class="badge badge-purple" style="font-size:1.2rem; padding:0.5rem 1rem">
            <i class="la la-users" /> {{ players.length }} player{{ players.length !== 1 ? 's' : '' }} joined
          </span>
          <div class="mt-2" style="display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center;">
            <span v-for="p in players" :key="p.id" class="badge badge-sky" style="font-size:1rem">{{ p.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="lb-content container-lg">
      <!-- ─── PODIUM (top 3) ─── -->
      <div v-if="top3.length > 0" class="lb-podium animate__animated animate__fadeIn">
        <div
          v-for="entry in [top3[1], top3[0], top3[2]].filter(Boolean)"
          :key="entry.name"
          class="podium-slot"
          :class="`podium-${entry.rank}`"
        >
          <div class="podium-name">{{ entry.name }}</div>
          <div class="podium-score">{{ entry.score.toLocaleString() }}</div>
          <div class="podium-block">
            <i v-if="entry.rank === 1" class="la la-crown podium-crown" />
            <span class="podium-rank">{{ entry.rank }}</span>
          </div>
        </div>
      </div>

      <!-- ─── REST OF LEADERBOARD ─── -->
      <div v-if="rest.length > 0" class="lb-rest">
        <div
          v-for="entry in rest"
          :key="entry.id"
          class="lb-row animate__animated animate__fadeInUp"
          :class="{ 'lb-eliminated': entry.eliminated }"
        >
          <div class="lb-rank">{{ entry.rank }}</div>
          <div class="lb-name">
            {{ entry.name }}
            <span v-if="entry.eliminated" class="badge badge-coral" style="font-size:0.7rem; margin-left:0.35rem">out</span>
          </div>
          <div v-if="rankDelta(entry) !== 0" class="rank-delta" :class="rankDelta(entry) > 0 ? 'delta-up' : 'delta-down'">
            <i :class="`la la-arrow-${rankDelta(entry) > 0 ? 'up' : 'down'}`" />
            {{ Math.abs(rankDelta(entry)) }}
          </div>
          <div class="lb-score">{{ entry.score.toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- Phase indicator -->
    <div class="lb-footer">
      <span v-if="phase === 'question'" class="lb-phase-text animate__animated animate__pulse animate__infinite">
        <i class="la la-play-circle" /> Question in progress
      </span>
      <span v-else-if="phase === 'leaderboard'" class="lb-phase-text">
        <i class="la la-trophy" /> Leaderboard
      </span>
      <span v-else-if="phase === 'ended'" class="lb-phase-text">
        <i class="la la-flag-checkered" /> Quiz Complete!
      </span>
      <span v-else-if="phase === 'lobby'" class="lb-phase-text">
        <i class="la la-users" /> Waiting for players...
      </span>
    </div>
  </div>
</template>

<style scoped>
.lb-page {
  min-height: 100vh;
  background: var(--light);
  display: flex;
  flex-direction: column;
}

.lb-header {
  background: var(--white);
  border-bottom: 3px solid var(--dark);
  padding: 1rem 0;
}
.lb-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.lb-title-area { display: flex; align-items: center; gap: 1rem; flex: 1; }
.lb-trophy-icon { font-size: 3rem; color: var(--yellow-dark); }
.lb-main-title { font-size: 2rem; font-weight: 900; line-height: 1.1; }
.lb-meta { display: flex; gap: 0.5rem; margin-top: 0.35rem; flex-wrap: wrap; }
.lb-live-timer { min-width: 260px; }
.lb-join-link { white-space: nowrap; }

.lb-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.lb-empty-inner { text-align: center; padding: 3rem; }

.lb-content {
  flex: 1;
  padding: 2rem 1.5rem;
}

/* Podium */
.lb-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.podium-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.podium-name {
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 0.5rem;
  max-width: 200px;
  word-break: break-word;
}

.podium-score {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--mid);
  margin-bottom: 0.5rem;
}

.podium-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  border: 3px solid var(--dark);
  border-radius: 12px 12px 0 0;
  padding: 1rem 2rem 0.5rem;
  box-shadow: 5px 5px 0 rgba(30,30,46,0.15);
  min-width: 120px;
}

.podium-rank { font-size: 2rem; font-weight: 900; }
.podium-crown { font-size: 2rem; color: var(--yellow-dark); }

.podium-1 .podium-block { background: var(--yellow-light); height: 140px; }
.podium-2 .podium-block { background: var(--purple-light); height: 110px; }
.podium-3 .podium-block { background: var(--coral-light); height: 85px; }

/* Rank delta */
.rank-delta {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}
.delta-up { color: var(--mint-dark); background: var(--mint-light); }
.delta-down { color: var(--coral-dark); background: var(--coral-light); }

.lb-eliminated { opacity: 0.5; }

.lb-rest { display: flex; flex-direction: column; gap: 0.5rem; }

.lb-footer {
  background: var(--white);
  border-top: 3px solid var(--dark);
  padding: 0.75rem 1.5rem;
  text-align: center;
}
.lb-phase-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--mid);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
</style>
