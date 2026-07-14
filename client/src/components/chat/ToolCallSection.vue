<script setup lang="ts">
import type { ToolCallInfo } from '@/stores/plan'

defineProps<{
  tools: ToolCallInfo[]
}>()

const LABELS = {
  TOGGLE: '🔧 工具调用',
} as const

const DISPLAY_LIMIT = 60

function formatValue(value: unknown): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  return str.length > DISPLAY_LIMIT ? str.slice(0, DISPLAY_LIMIT) + '…' : str
}
</script>

<template>
  <details class="rounded-lg border border-gray-200 bg-gray-50/50">
    <summary class="cursor-pointer select-none px-3 py-2 text-xs text-gray-500 hover:text-gray-700">
      <span class="mr-1">🔧</span>{{ LABELS.TOGGLE }}（{{ tools.length }}）
    </summary>
    <div class="space-y-2 px-3 pb-3">
      <div v-for="t in tools" :key="t.tool" class="text-xs">
        <div class="flex items-center gap-2">
          <span :class="t.status === 'start' ? 'text-accent' : 'text-success'">
            {{ t.status === 'start' ? '⏳' : '✅' }}
          </span>
          <span class="font-medium text-gray-600">{{ t.tool }}</span>
        </div>
        <div v-if="t.input" class="mt-0.5 text-[10px] text-gray-400 pl-5">
          {{ formatValue(t.input) }}
        </div>
        <div v-if="t.output" class="text-[10px] text-gray-400 pl-5 truncate">
          {{ formatValue(t.output) }}
        </div>
      </div>
    </div>
  </details>
</template>
