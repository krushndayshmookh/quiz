<script setup lang="ts">
const props = defineProps<{
  question: string
  locked?: boolean
  allowChange?: boolean
  correctAnswer?: number | null
  savedAnswer?: number
}>()

const emit = defineEmits<{
  (e: 'answer', value: number): void
}>()

const inputVal = ref(props.savedAnswer !== undefined ? String(props.savedAnswer) : '')
// hasSubmitted only used in non-allowChange (blitz/survival) mode
const hasSubmitted = ref(!props.allowChange && props.savedAnswer !== undefined)
const parsedValue = computed(() => {
  const n = parseInt(inputVal.value, 10)
  return isNaN(n) ? null : n
})

// In classic/allowChange mode: auto-save on every valid change
watch(parsedValue, (val) => {
  if (props.allowChange && !props.locked && val !== null) {
    emit('answer', val)
  }
})

function submit() {
  if (props.locked || parsedValue.value === null) return
  if (!props.allowChange && hasSubmitted.value) return
  hasSubmitted.value = true
  emit('answer', parsedValue.value)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') submit()
}
</script>

<template>
  <div class="integer-wrap">
    <div class="question-text animate__animated animate__fadeInDown">{{ question }}</div>
    <div class="int-input-row animate__animated animate__fadeInUp">
      <input
        v-model="inputVal"
        type="number"
        class="input input-xl int-input"
        placeholder="Enter a number"
        :disabled="locked || (!allowChange && hasSubmitted)"
        @keydown="onKey"
      />
      <!-- Submit button only shown in blitz/survival mode (not classic/allowChange) -->
      <button
        v-if="!allowChange"
        class="btn btn-xl btn-primary"
        :disabled="locked || hasSubmitted || parsedValue === null"
        @click="submit"
      >
        <i class="la la-paper-plane" />
        Submit
      </button>
    </div>

    <!-- Classic mode: show saved indicator when a valid number is entered -->
    <div v-if="allowChange && parsedValue !== null" class="int-submitted animate__animated animate__bounceIn">
      <i class="la la-save" style="color: var(--mint-dark)" />
      Answer saved: <strong>{{ inputVal }}</strong>
    </div>
    <!-- Blitz/survival mode: show submitted state -->
    <div v-else-if="!allowChange && hasSubmitted" class="int-submitted animate__animated animate__bounceIn">
      <i class="la la-check-circle" style="color: var(--mint-dark)" />
      Answer submitted: <strong>{{ inputVal }}</strong>
    </div>

    <div v-if="correctAnswer !== null && correctAnswer !== undefined" class="int-answer animate__animated animate__fadeIn">
      <span v-if="parsedValue === correctAnswer" style="color: var(--mint-dark)">
        <i class="la la-check-circle" /> Correct!
      </span>
      <span v-else style="color: var(--coral-dark)">
        <i class="la la-times-circle" /> Correct answer: <strong>{{ correctAnswer }}</strong>
      </span>
    </div>
  </div>
</template>

<style scoped>
.int-input-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.int-input {
  max-width: 260px;
}

.int-submitted, .int-answer {
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
