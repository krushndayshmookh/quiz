<script setup lang="ts">
import type { LeaderboardEntry } from '~/composables/useQuiz'

defineProps<{
  entries: LeaderboardEntry[]
  projector?: boolean
  limit?: number
  currentPlayer?: string
}>()
</script>

<template>
  <div class="leaderboard" :class="{ 'projector-mode': projector }">
    <div
      v-for="(entry, i) in (limit ? entries.slice(0, limit) : entries)"
      :key="entry.id"
      class="lb-row animate__animated animate__fadeInUp"
      :style="{ animationDelay: `${i * 0.05}s` }"
      :class="{
        'lb-eliminated': entry.eliminated,
        'lb-me': currentPlayer && entry.name === currentPlayer,
      }"
    >
      <div class="lb-rank" :class="{ gold: entry.rank === 1, silver: entry.rank === 2, bronze: entry.rank === 3 }">
        <i v-if="entry.rank === 1" class="la la-crown" />
        <span v-else>{{ entry.rank }}</span>
      </div>
      <div class="lb-name">
        {{ entry.name }}
        <span v-if="currentPlayer && entry.name === currentPlayer" class="badge badge-purple ml-1" style="font-size:0.7rem">You</span>
        <span v-if="entry.eliminated" class="badge badge-coral ml-1">eliminated</span>
        <span v-if="!entry.connected" class="badge badge-dark ml-1">offline</span>
      </div>
      <div class="lb-score">{{ entry.score.toLocaleString() }}</div>
    </div>
    <div v-if="entries.length === 0" class="text-center text-muted mt-3">
      No players yet
    </div>
  </div>
</template>

<style scoped>
.lb-eliminated {
  opacity: 0.5;
  background: var(--coral-light) !important;
}

/* Highlight current player row */
.lb-me {
  background: var(--purple-light) !important;
  border-left: 4px solid var(--purple-dark) !important;
  font-weight: 900;
}
.lb-me .lb-name { color: var(--purple-dark); }
.lb-me .lb-score { color: var(--purple-dark); }

.ml-1 { margin-left: 0.35rem; }
</style>
