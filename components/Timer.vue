<script setup lang="ts">
const props = defineProps<{
  remaining: number
  max: number
}>()

const percent = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(100, (props.remaining / props.max) * 100)
})

const barClass = computed(() => {
  if (percent.value > 50) return 'safe'
  if (percent.value > 25) return 'warn'
  return 'danger'
})
</script>

<template>
  <div class="timer-wrap">
    <div class="timer-display" :class="barClass">
      <i class="la la-clock" />
      <span class="timer-number">{{ remaining }}</span>
    </div>
    <div class="timer-bar-wrap">
      <div
        class="timer-bar"
        :class="barClass"
        :style="{ width: percent + '%' }"
      />
    </div>
  </div>
</template>

<style scoped>
.timer-wrap {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.5rem;
  font-weight: 900;
  min-width: 5rem;
  border: 3px solid var(--dark);
  border-radius: 12px;
  padding: 0.3rem 0.75rem;
  background: var(--white);
  box-shadow: 3px 3px 0 rgba(30,30,46,0.15);
}

.timer-display.safe   { color: var(--mint-dark); }
.timer-display.warn   { color: var(--yellow-dark); }
.timer-display.danger { color: var(--coral-dark); animation: pulse 0.7s infinite; }

.timer-bar-wrap {
  flex: 1;
  background: rgba(30,30,46,0.1);
  border: 3px solid var(--dark);
  border-radius: 999px;
  height: 20px;
  overflow: hidden;
}

.timer-bar {
  height: 100%;
  transition: width 1s linear, background 0.5s;
  border-radius: 999px;
}

.timer-bar.safe   { background: var(--mint); }
.timer-bar.warn   { background: var(--yellow); }
.timer-bar.danger { background: var(--coral); }

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}
</style>
