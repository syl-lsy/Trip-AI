<script setup lang="ts">
import { computed } from 'vue'
import type { DayPlan, ItineraryNode } from '@/stores/plan'
import TimelineNode from './TimelineNode.vue'

const props = withDefaults(
  defineProps<{
    day: DayPlan
    isToday?: boolean
  }>(),
  {
    isToday: false,
  },
)

const NODE_TYPE_COLORS: Record<string, string> = {
  transport: '#4A90D9',
  accommodation: '#EF4444',
  attraction: '#7EB8A0',
  dining: '#F5A623',
  rest: '#9CA3AF',
}

const borderColor = computed(() => {
  const firstNode = props.day.nodes.find((n: ItineraryNode) => n.type !== 'rest')
  if (!firstNode) return '#E5E7EB'
  return NODE_TYPE_COLORS[firstNode.type] ?? '#E5E7EB'
})
</script>

<template>
  <div
    class="bg-white rounded-xl overflow-hidden"
    :class="isToday ? 'ring-2 ring-[#4A90D9]/20' : ''"
    :style="{
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: '4px solid ' + borderColor,
    }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3">
      <div class="flex items-center gap-2">
        <span class="text-base font-semibold text-gray-900">Day {{ day.day }}</span>
        <span class="text-sm text-gray-400">· {{ day.date }}</span>
        <span
          v-if="isToday"
          class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style="background-color: #4a90d910; color: #4a90d9"
        >
          今日
        </span>
      </div>
      <span class="text-sm text-gray-500">{{ day.paceDescription }}</span>
    </div>

    <!-- Nodes -->
    <div class="px-5 pb-4">
      <div v-if="day.nodes.length === 0" class="text-sm text-gray-400 py-4 text-center">
        暂无行程安排
      </div>
      <TimelineNode
        v-for="(node, idx) in day.nodes"
        :key="'node-' + idx"
        :node="node"
        :is-last="idx === day.nodes.length - 1"
      />
    </div>
  </div>
</template>
