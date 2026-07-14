<script setup lang="ts">
defineProps<{
  reasoning: string
}>()

const LABELS = {
  TOGGLE: '🤔 思考过程',
} as const
</script>

<template>
  <details class="rounded-lg border border-gray-200 bg-gray-50/50">
    <summary class="cursor-pointer select-none px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
      <span class="mr-1">🤔</span>{{ LABELS.TOGGLE }}
    </summary>
    <div class="px-3 pb-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
      {{ reasoning }}
    </div>
  </details>
</template>
