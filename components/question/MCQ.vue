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

/** True if the option should render as a preformatted code block */
function isCodeOption(opt: string) {
  return opt.includes('\n') || opt.startsWith('```')
}

/** Split an option string into inline segments (plain text vs `inline code`) */
function inlineParts(opt: string) {
  return opt.split(/(`[^`\n]+`)/).map((part, i) => ({
    isInline: i % 2 === 1,
    content: i % 2 === 1 ? part.slice(1, -1) : part,
  }))
}
</script>

<template>
  <div class="mcq-wrap">
    <QuestionText :text="question" class="animate__animated animate__fadeInDown" />
    <div class="answer-grid">
      <button
        v-for="(opt, idx) in options"
        :key="idx"
        class="answer-btn animate__animated animate__fadeInUp"
        :class="[btnClass(idx), { 'answer-btn-code': isCodeOption(opt) }]"
        :style="{
          animationDelay: `${idx * 0.07}s`,
          '--bg': colors[idx % colors.length],
          '--bg-dark': darkColors[idx % darkColors.length],
        }"
        @click="select(idx)"
      >
        <span class="answer-letter">{{ letters[idx] }}</span>

        <!-- Multiline option → preformatted code block -->
        <pre v-if="isCodeOption(opt)" class="opt-code"><code>{{ opt.startsWith('```') ? opt.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '') : opt }}</code></pre>

        <!-- Single-line option → inline text with optional `backtick` code spans -->
        <span v-else class="opt-text">
          <template v-for="(part, pi) in inlineParts(opt)" :key="pi">
            <code v-if="part.isInline" class="opt-inline-code">{{ part.content }}</code>
            <span v-else>{{ part.content }}</span>
          </template>
        </span>

        <i v-if="correctAnswer !== null && correctAnswer !== undefined && idx === correctAnswer" class="la la-check-circle ml-auto" style="color: var(--mint-dark)" />
        <i v-else-if="correctAnswer !== null && correctAnswer !== undefined && idx === selected" class="la la-times-circle ml-auto" style="color: var(--coral-dark)" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ml-auto { margin-left: auto; }

/* ── Standard single-line option button ── */
.answer-btn {
  background: var(--bg, var(--white));
  animation-duration: 0.35s;
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

/* ── Code-option button overrides ── */
.answer-btn-code {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}
.answer-btn-code .answer-letter {
  /* Keep the letter on its own line above the code */
  align-self: flex-start;
}

/* Preformatted code inside an option button */
.opt-code {
  background: #1e1e2e;
  color: #cdd6f4;
  border: 2px solid rgba(0,0,0,0.35);
  border-radius: 7px;
  padding: 0.65rem 0.9rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
  width: 100%;
  text-align: left;
  margin: 0;
}
.opt-code code {
  background: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
  border: none;
}

/* Inline `code` within a plain option label */
.opt-inline-code {
  background: rgba(0,0,0,0.1);
  color: inherit;
  border: 1.5px solid currentColor;
  border-radius: 4px;
  padding: 0.05em 0.35em;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.88em;
  font-weight: 700;
  opacity: 0.9;
}
.answer-btn.selected .opt-inline-code {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.5);
}
</style>
