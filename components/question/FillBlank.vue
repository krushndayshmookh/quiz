<script setup lang="ts">
const props = defineProps<{
  question: string
  locked?: boolean
  allowChange?: boolean
  submitted?: boolean
  correctAnswer?: string | null
  savedAnswer?: string
}>()

const emit = defineEmits<{
  (e: 'answer', value: string): void
}>()

const inputVal = ref(props.savedAnswer ?? '')
// hasSubmitted only used in non-allowChange (blitz/survival) mode
const hasSubmitted = ref(!props.allowChange && (props.submitted ?? props.savedAnswer !== undefined))

// In classic/allowChange mode: auto-save on every change
watch(inputVal, (val) => {
  if (props.allowChange && !props.locked && val.trim()) {
    emit('answer', val.trim())
  }
})

function submit() {
  if (props.locked || !inputVal.value.trim()) return
  if (!props.allowChange && hasSubmitted.value) return
  hasSubmitted.value = true
  emit('answer', inputVal.value.trim())
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') submit()
}
</script>

<template>
  <div class="fill-wrap">
    <div class="question-text animate__animated animate__fadeInDown">{{ question }}</div>
    <div class="fill-input-row animate__animated animate__fadeInUp">
      <input
        v-model="inputVal"
        type="text"
        class="input input-xl"
        placeholder="Type your answer..."
        :disabled="locked || (!allowChange && hasSubmitted)"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @keydown="onKey"
      />
      <!-- Submit button only shown in blitz/survival mode (not classic/allowChange) -->
      <button
        v-if="!allowChange"
        class="btn btn-xl btn-primary"
        :disabled="locked || hasSubmitted || !inputVal.trim()"
        @click="submit"
      >
        <i class="la la-paper-plane" />
        Submit
      </button>
    </div>

    <!-- Classic mode: show saved indicator when a value is typed -->
    <div v-if="allowChange && inputVal.trim()" class="fill-submitted animate__animated animate__bounceIn">
      <i class="la la-save" style="color: var(--mint-dark)" />
      Answer saved: <strong>{{ inputVal }}</strong>
    </div>
    <!-- Blitz/survival mode: show submitted state -->
    <div v-else-if="!allowChange && hasSubmitted" class="fill-submitted animate__animated animate__bounceIn">
      <i class="la la-check-circle" style="color: var(--mint-dark)" />
      Answer submitted: <strong>{{ inputVal }}</strong>
    </div>

    <div v-if="correctAnswer !== null && correctAnswer !== undefined" class="fill-answer animate__animated animate__fadeIn">
      <span v-if="inputVal.trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()" style="color: var(--mint-dark)">
        <i class="la la-check-circle" /> Correct!
      </span>
      <span v-else style="color: var(--coral-dark)">
        <i class="la la-times-circle" /> Correct answer: <strong>{{ correctAnswer }}</strong>
      </span>
    </div>
  </div>
</template>

<style scoped>
.fill-input-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.fill-submitted, .fill-answer {
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
