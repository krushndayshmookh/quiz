<script setup lang="ts">
const props = defineProps<{
  question: string
  locked?: boolean
  allowChange?: boolean
  selected?: boolean | null
  correctAnswer?: boolean | null
}>()

const emit = defineEmits<{
  (e: 'answer', value: boolean): void
}>()

function select(val: boolean) {
  if (props.locked) return
  if (!props.allowChange && props.selected !== null && props.selected !== undefined) return
  emit('answer', val)
}

function btnClass(val: boolean) {
  if (props.correctAnswer !== null && props.correctAnswer !== undefined) {
    if (val === props.correctAnswer) return 'correct'
    if (val === props.selected) return 'wrong'
    return 'disabled'
  }
  if (props.selected === val) return 'selected'
  if (props.locked) return 'disabled'
  return ''
}
</script>

<template>
  <div class="tf-wrap">
    <QuestionText :text="question" class="animate__animated animate__fadeInDown" />
    <div class="tf-grid">
      <button
        class="answer-btn tf-btn animate__animated animate__fadeInLeft"
        :class="[btnClass(true), 'tf-true']"
        @click="select(true)"
      >
        <i class="la la-check la-2x" />
        <span>True</span>
      </button>
      <button
        class="answer-btn tf-btn animate__animated animate__fadeInRight"
        :class="[btnClass(false), 'tf-false']"
        @click="select(false)"
      >
        <i class="la la-times la-2x" />
        <span>False</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.tf-btn {
  min-height: 120px;
  flex-direction: column;
  font-size: 1.5rem;
  font-weight: 900;
  gap: 0.5rem;
}

.tf-true  { background: var(--mint-light); }
.tf-false { background: var(--coral-light); }

/* Selected: override the per-button color with the shared purple, matching MCQ */
.answer-btn.selected {
  background: var(--purple) !important;
  border-color: var(--purple-dark) !important;
  color: var(--white);
  box-shadow: 4px 4px 0 rgba(30, 30, 46, 0.25);
  transform: scale(1.02);
}

@media (max-width: 420px) {
  .tf-grid { grid-template-columns: 1fr; }
}
</style>
