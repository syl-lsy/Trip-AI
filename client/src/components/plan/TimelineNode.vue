<script setup lang="ts">
import type { ItineraryNode } from '@/stores/plan'

defineProps<{
  node: ItineraryNode
  isLast?: boolean
}>()

const TYPE_EMOJI: Record<string, string> = {
  transport: '🚗',
  accommodation: '🏨',
  attraction: '🏔️',
  dining: '🍽️',
  rest: '😴',
}

const TYPE_COLOR: Record<string, string> = {
  transport: '#4A90D9',
  accommodation: '#EF4444',
  attraction: '#7EB8A0',
  dining: '#F5A623',
  rest: '#9CA3AF',
}
</script>

<template>
  <div class="relative flex gap-4 pb-6 last:pb-0">
    <!-- Vertical dashed line -->
    <div
      v-if="!isLast"
      class="absolute left-[18px] top-8 bottom-0 w-0 border-l-2 border-dashed border-gray-200"
    />

    <!-- Icon circle -->
    <div class="relative flex-shrink-0 w-[38px] flex justify-center">
      <div
        class="w-[38px] h-[38px] rounded-full flex items-center justify-center text-base"
        :style="{ backgroundColor: TYPE_COLOR[node.type] + '15' }"
      >
        {{ TYPE_EMOJI[node.type] ?? '📍' }}
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0 pt-1">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 font-mono">{{ node.time }}</span>
        <span class="text-sm font-medium text-gray-900 truncate">{{ node.title }}</span>
      </div>

      <div class="mt-0.5 text-xs font-medium" :style="{ color: TYPE_COLOR[node.type] }">
        ¥{{ node.cost }}{{ node.cost > 0 ? ' (预估)' : '' }}
      </div>

      <!-- Notes -->
      <div
        v-for="(note, idx) in node.notes"
        :key="'note-' + idx"
        class="mt-0.5 text-xs text-gray-400"
      >
        {{ note }}
      </div>

      <!-- Knowledge tags -->
      <div v-if="node.knowledgeRefs.length > 0" class="mt-1.5 flex flex-wrap gap-1">
        <span
          v-for="(ref, idx) in node.knowledgeRefs"
          :key="'ref-' + idx"
          class="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full"
          style="background-color: #4a90d910; color: #4a90d9"
        >
          📚 {{ ref }}
        </span>
      </div>
    </div>
  </div>
</template>
