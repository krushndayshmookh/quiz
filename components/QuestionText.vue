<script setup lang="ts">
const props = defineProps<{ text: string }>()

/**
 * Split text into code-fence blocks (```) and prose segments.
 * Odd-indexed splits (between fences) are code blocks.
 */
const segments = computed(() => {
  const parts = props.text.split('```')
  return parts
    .map((part, i) => ({
      isCode: i % 2 === 1,
      // Strip the optional language tag on the opening fence line (e.g. ```dockerfile)
      content: i % 2 === 1
        ? part.replace(/^[a-z]*\n/, '').replace(/\n$/, '')
        : part,
    }))
    .filter(s => s.content !== '')
})

/**
 * Within a prose segment: split on `inline code` spans.
 * Odd-indexed splits are inline code.
 */
function inlineParts(text: string) {
  return text.split(/(`[^`\n]+`)/).map((part, i) => ({
    isInline: i % 2 === 1,
    content: i % 2 === 1 ? part.slice(1, -1) : part,
  }))
}
</script>

<template>
  <div class="question-text">
    <template v-for="(seg, si) in segments" :key="si">
      <pre v-if="seg.isCode" class="qt-code-block"><code>{{ seg.content }}</code></pre>
      <span v-else>
        <template v-for="(part, pi) in inlineParts(seg.content)" :key="pi">
          <code v-if="part.isInline" class="qt-inline-code">{{ part.content }}</code>
          <span v-else class="qt-prose">{{ part.content }}</span>
        </template>
      </span>
    </template>
  </div>
</template>

<style scoped>
/* Code fence block */
.qt-code-block {
  background: #1e1e2e;
  color: #cdd6f4;
  border: 3px solid var(--dark);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.92rem;
  font-weight: 500;
  line-height: 1.65;
  overflow-x: auto;
  margin: 0.6rem 0 0.25rem;
  white-space: pre;
  box-shadow: 4px 4px 0 rgba(30, 30, 46, 0.35);
}

.qt-code-block code {
  background: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  padding: 0;
  border: none;
}

/* Inline `code` span */
.qt-inline-code {
  background: var(--purple-light);
  color: var(--purple-dark);
  border: 2px solid var(--purple-dark);
  border-radius: 5px;
  padding: 0.05em 0.4em;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85em;
  font-weight: 700;
  vertical-align: baseline;
}

/* Preserve newlines in regular prose */
.qt-prose {
  white-space: pre-wrap;
}
</style>
