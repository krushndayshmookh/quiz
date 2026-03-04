<script setup lang="ts">
const props = defineProps<{
  question: string
  options: string[]
  questionIndex: number
  locked?: boolean
  allowChange?: boolean
  selected?: number | null
  correctAnswer?: number | null
}>()

const emit = defineEmits<{
  (e: 'answer', value: number): void
}>()

const letters = ['A', 'B', 'C', 'D', 'E', 'F']

const colors = ['var(--purple-light)', 'var(--coral-light)', 'var(--mint-light)', 'var(--sky-light)', 'var(--yellow-light)', 'var(--purple-light)']
const darkColors = ['var(--purple-dark)', 'var(--coral-dark)', 'var(--mint-dark)', 'var(--sky-dark)', 'var(--yellow-dark)', 'var(--purple-dark)']

function select(idx: number) {
  if (props.locked) return
  if (!props.allowChange && props.selected !== null && props.selected !== undefined) return
  emit('answer', idx)
}

function btnClass(idx: number) {
  if (props.correctAnswer !== null && props.correctAnswer !== undefined) {
    if (idx === props.correctAnswer) return 'correct'
    if (idx === props.selected) return 'wrong'
    return 'disabled'
  }
  if (props.selected === idx) return 'selected'
  if (props.locked) return 'disabled'
  return ''
}
</script>

<template>
  <div class="mcq-wrap">
    <div class="question-text animate__animated animate__fadeInDown">{{ question }}</div>
    <div class="answer-grid">
      <button
        v-for="(opt, idx) in options"
        :key="idx"
        class="answer-btn animate__animated animate__fadeInUp"
        :class="btnClass(idx)"
        :style="{
          animationDelay: `${idx * 0.07}s`,
          '--bg': colors[idx % colors.length],
          '--bg-dark': darkColors[idx % darkColors.length],
        }"
        @click="select(idx)"
      >
        <span class="answer-letter">{{ letters[idx] }}</span>
        <span>{{ opt }}</span>
        <i v-if="correctAnswer !== null && correctAnswer !== undefined && idx === correctAnswer" class="la la-check-circle ml-auto" style="color: var(--mint-dark)" />
        <i v-else-if="correctAnswer !== null && correctAnswer !== undefined && idx === selected" class="la la-times-circle ml-auto" style="color: var(--coral-dark)" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ml-auto { margin-left: auto; }

.answer-btn {
  background: var(--bg, var(--white));
}
.answer-btn.selected {
  background: var(--purple) !important;
  border-color: var(--purple-dark) !important;
  color: var(--white);
  box-shadow: 4px 4px 0 rgba(30,30,46,0.25);
  transform: scale(1.02);
}
.answer-btn.selected .answer-letter {
  background: var(--white);
  color: var(--purple-dark);
}
.answer-btn:hover:not(.disabled):not(.selected):not(.correct):not(.wrong) {
  background: var(--bg, var(--white));
  filter: brightness(0.95);
}
</style>
