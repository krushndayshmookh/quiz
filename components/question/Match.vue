<script setup lang="ts">
const props = defineProps<{
  question: string
  left: string[]
  right: string[]
  locked?: boolean
  allowChange?: boolean
  correctAnswer?: number[][] | null
}>()

const emit = defineEmits<{
  (e: 'answer', value: number[][]): void
}>()

// matches[leftIdx] = rightIdx (or null if not matched yet)
const matches = ref<(number | null)[]>(props.left.map(() => null))
const selectedLeft = ref<number | null>(null)
const hasSubmitted = ref(false)

// Shuffled right indices for display
const shuffledRight = computed(() => {
  const indices = props.right.map((_, i) => i)
  return indices
})

const pairColors = [
  { bg: 'var(--purple-light)', border: 'var(--purple-dark)' },
  { bg: 'var(--coral-light)',  border: 'var(--coral-dark)' },
  { bg: 'var(--mint-light)',   border: 'var(--mint-dark)' },
  { bg: 'var(--sky-light)',    border: 'var(--sky-dark)' },
  { bg: 'var(--yellow-light)', border: 'var(--yellow-dark)' },
  { bg: '#e8d5f5',             border: '#7c3aed' },
  { bg: '#fcd9c8',             border: '#c2410c' },
  { bg: '#c7f5e0',             border: '#059669' },
]

function getPairIndex(leftIdx: number): number | null {
  if (matches.value[leftIdx] === null) return null
  return leftIdx
}

function getRightPairIndex(rightIdx: number): number | null {
  const leftIdx = matches.value.findIndex(m => m === rightIdx)
  return leftIdx !== -1 ? leftIdx : null
}

const allMatched = computed(() => matches.value.every(m => m !== null))
const anyMatched = computed(() => matches.value.some(m => m !== null))
const matchedCount = computed(() => matches.value.filter(m => m !== null).length)

// In classic/allowChange mode: auto-save on every match change (no lock)
watch(matches, () => {
  if (props.allowChange && !props.locked && anyMatched.value) {
    const pairs = matches.value
      .map((r, l) => [l, r as number])
      .filter(([, r]) => r !== null) as number[][]
    emit('answer', pairs)
  }
}, { deep: true })

// In blitz/survival mode: auto-submit when all pairs matched
watch(allMatched, (val) => {
  if (val && !hasSubmitted.value && !props.locked && !props.allowChange) {
    submit()
  }
})

function selectLeft(idx: number) {
  if (props.locked) return
  // In classic mode (allowChange), always allow re-selecting; in blitz lock after submit
  if (!props.allowChange && hasSubmitted.value) return
  selectedLeft.value = selectedLeft.value === idx ? null : idx
}

function selectRight(rightIdx: number) {
  if (props.locked) return
  if (!props.allowChange && hasSubmitted.value) return
  if (selectedLeft.value === null) return

  const leftIdx = selectedLeft.value

  // Toggle off if already matched to same
  if (matches.value[leftIdx] === rightIdx) {
    matches.value[leftIdx] = null
    selectedLeft.value = null
    return
  }

  // Unset any existing match to this right item
  const prevLeft = matches.value.findIndex(m => m === rightIdx)
  if (prevLeft !== -1) matches.value[prevLeft] = null

  matches.value[leftIdx] = rightIdx
  selectedLeft.value = null
}

function submit() {
  if (!anyMatched.value || hasSubmitted.value) return
  hasSubmitted.value = true
  const pairs = matches.value
    .map((r, l) => [l, r as number])
    .filter(([, r]) => r !== null) as number[][]
  emit('answer', pairs)
}

function getRightClass(rightIdx: number) {
  if (props.locked && !props.correctAnswer) return 'disabled'
  if (props.correctAnswer) {
    // Check if this right was correctly matched
    const leftForRight = matches.value.findIndex(m => m === rightIdx)
    if (leftForRight === -1) return 'disabled'
    const expected = props.correctAnswer.find(([l]) => l === leftForRight)
    if (expected && expected[1] === rightIdx) return 'correct'
    return 'wrong'
  }
  const matchedLeft = matches.value.findIndex(m => m === rightIdx)
  if (matchedLeft !== -1) return 'matched'
  return ''
}

function getLeftClass(leftIdx: number) {
  if (props.locked && !props.correctAnswer) return 'disabled'
  if (props.correctAnswer) {
    const myRight = matches.value[leftIdx]
    if (myRight === null) return 'disabled'
    const expected = props.correctAnswer.find(([l]) => l === leftIdx)
    if (expected && expected[1] === myRight) return 'correct'
    return 'wrong'
  }
  if (selectedLeft.value === leftIdx) return 'selected'
  if (matches.value[leftIdx] !== null) return 'matched'
  return ''
}

function getLeftStyle(leftIdx: number) {
  if (props.correctAnswer || props.locked) return {}
  const pi = getPairIndex(leftIdx)
  if (pi !== null) {
    const color = pairColors[pi % pairColors.length]
    return { background: color.bg, borderColor: color.border }
  }
  if (selectedLeft.value === leftIdx) return { background: 'var(--purple)' }
  return {}
}

function getRightStyle(rightIdx: number) {
  if (props.correctAnswer || props.locked) return {}
  const pi = getRightPairIndex(rightIdx)
  if (pi !== null) {
    const color = pairColors[pi % pairColors.length]
    return { background: color.bg, borderColor: color.border }
  }
  return {}
}

function getMatchedRightLabel(leftIdx: number) {
  const r = matches.value[leftIdx]
  return r !== null ? props.right[r] : null
}
</script>

<template>
  <div class="match-wrap">
    <div class="question-text animate__animated animate__fadeInDown">{{ question }}</div>
    <p v-if="!locked" class="text-muted text-sm mb-2">
      <i class="la la-info-circle" />
      <span v-if="allowChange">Select a left item, then a right item to match</span>
      <span v-else>Select a left item, then a right item to match them. All {{ left.length }} pairs matched = auto-submitted.</span>
    </p>

    <div class="match-columns">
      <!-- Left column -->
      <div class="match-col">
        <div
          v-for="(item, idx) in left"
          :key="idx"
          class="match-item animate__animated animate__fadeInLeft"
          :class="getLeftClass(idx)"
          :style="{ animationDelay: `${idx * 0.07}s`, ...getLeftStyle(idx) }"
          @click="selectLeft(idx)"
        >
          <span class="match-label">{{ item }}</span>
          <span v-if="matches[idx] !== null" class="match-arrow">
            <i class="la la-arrow-right" />
          </span>
        </div>
      </div>

      <!-- Right column -->
      <div class="match-col">
        <div
          v-for="rightIdx in shuffledRight"
          :key="rightIdx"
          class="match-item animate__animated animate__fadeInRight"
          :class="getRightClass(rightIdx)"
          :style="{ animationDelay: `${rightIdx * 0.07}s`, ...getRightStyle(rightIdx) }"
          @click="selectRight(rightIdx)"
        >
          {{ right[rightIdx] }}
        </div>
      </div>
    </div>

    <!-- Classic mode: show current matches summary (always visible while working) -->
    <div v-if="allowChange && anyMatched && !locked" class="match-summary animate__animated animate__fadeIn">
      <div v-for="(r, l) in matches" :key="l" class="match-pair" :style="r !== null ? { background: pairColors[l % pairColors.length].bg, borderLeft: `4px solid ${pairColors[l % pairColors.length].border}`, padding: '0.5rem 0.75rem', borderRadius: '8px' } : {}">
        <template v-if="r !== null">
          <span>{{ left[l] }}</span>
          <i class="la la-arrows-alt-h" />
          <span>{{ right[r] }}</span>
        </template>
      </div>
      <p class="text-muted text-sm mt-1">
        <i class="la la-save" style="color: var(--mint-dark)" /> {{ matchedCount }}/{{ left.length }} pairs saved
      </p>
    </div>

    <!-- Blitz/survival mode: partial submit UI -->
    <div v-else-if="!allowChange && anyMatched && !hasSubmitted && !allMatched" class="match-summary animate__animated animate__fadeIn">
      <div v-for="(r, l) in matches" :key="l" class="match-pair" :style="r !== null ? { background: pairColors[l % pairColors.length].bg, borderLeft: `4px solid ${pairColors[l % pairColors.length].border}`, padding: '0.5rem 0.75rem', borderRadius: '8px' } : {}">
        <template v-if="r !== null">
          <span>{{ left[l] }}</span>
          <i class="la la-arrows-alt-h" />
          <span>{{ right[r] }}</span>
        </template>
      </div>
      <button class="btn btn-xl btn-sky mt-3" @click="submit">
        <i class="la la-check" />
        Submit {{ matchedCount }}/{{ left.length }} Pairs (Partial)
      </button>
      <p class="text-muted text-sm mt-1">
        <i class="la la-info-circle" /> Match all {{ left.length }} pairs to auto-submit, or submit partial for partial credit.
      </p>
    </div>

    <!-- Blitz/survival submitted confirmation -->
    <div v-if="!allowChange && hasSubmitted" class="mt-2 animate__animated animate__bounceIn" style="font-weight:700; color: var(--mint-dark)">
      <i class="la la-check-circle" /> Matches submitted!
    </div>
  </div>
</template>

<style scoped>
.match-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.match-col {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.match-item {
  padding: 0.8rem 1rem;
  border: 3px solid var(--dark);
  border-radius: 12px;
  background: var(--white);
  cursor: pointer;
  font-weight: 600;
  box-shadow: 3px 3px 0 rgba(30,30,46,0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  transition: background 0.15s;
  min-height: 56px;
}

.match-item.selected { background: var(--purple); color: var(--white); }
.match-item.matched  { background: var(--sky-light); border-color: var(--sky-dark); }
.match-item.correct  { background: var(--mint); border-color: var(--mint-dark); }
.match-item.wrong    { background: var(--coral); border-color: var(--coral-dark); }
.match-item.disabled { opacity: 0.5; cursor: default; }

.match-item:hover:not(.selected):not(.matched):not(.correct):not(.wrong):not(.disabled) {
  background: var(--purple-light);
}

.match-label { flex: 1; }
.match-arrow { color: var(--sky-dark); }

.match-summary {
  background: var(--purple-light);
  border: 3px solid var(--dark);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.match-pair {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  font-weight: 700;
}

.match-pair i { color: var(--purple-dark); }

@media (max-width: 480px) {
  .match-columns { grid-template-columns: 1fr; }
}
</style>
