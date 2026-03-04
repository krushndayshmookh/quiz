<script setup lang="ts">
defineProps<{
  players: Array<{
    id: string
    name: string
    connected: boolean
    eliminated?: boolean
    score?: number
  }>
  showScore?: boolean
}>()
</script>

<template>
  <div class="player-list">
    <div
      v-for="player in players"
      :key="player.id"
      class="player-chip animate__animated animate__fadeIn"
      :class="{
        offline: !player.connected,
        eliminated: player.eliminated,
      }"
    >
      <i class="la la-user" />
      <span>{{ player.name }}</span>
      <span v-if="showScore && player.score !== undefined" class="chip-score">
        {{ player.score }}
      </span>
      <i v-if="!player.connected" class="la la-wifi-slash text-muted" />
      <i v-if="player.eliminated" class="la la-times-circle" style="color: var(--coral-dark)" />
    </div>
    <div v-if="players.length === 0" class="text-muted text-sm mt-2">
      No players yet
    </div>
  </div>
</template>

<style scoped>
.player-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.chip-score {
  font-weight: 900;
  color: var(--purple-dark);
  margin-left: 0.25rem;
}
</style>
