<script setup lang="ts">
export interface ProgressStep {
  id: number
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

defineProps<{
  steps: ProgressStep[]
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div class="space-y-3 p-4">
    <div class="text-sm font-medium text-gray-500 mb-3">正在生成行程…</div>
    <div v-for="step in steps" :key="step.id" class="flex items-center gap-3">
      <div
        v-if="step.status === 'completed'"
        class="w-5 h-5 rounded-full bg-[#7EB8A0]/20 flex items-center justify-center"
      >
        <svg
          class="w-3 h-3 text-[#7EB8A0]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div
        v-else-if="step.status === 'running'"
        class="w-5 h-5 rounded-full bg-[#4A90D9]/20 flex items-center justify-center"
      >
        <span class="w-3 h-3 rounded-full bg-[#4A90D9] animate-pulse" />
      </div>
      <div
        v-else-if="step.status === 'failed'"
        class="w-5 h-5 rounded-full bg-[#EF4444]/20 flex items-center justify-center"
      >
        <svg
          class="w-3 h-3 text-[#EF4444]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div v-else class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
        <span class="w-2 h-2 rounded-full bg-gray-300" />
      </div>
      <span
        :class="[
          'text-sm',
          step.status === 'completed'
            ? 'text-gray-500'
            : step.status === 'running'
              ? 'text-[#4A90D9] font-medium'
              : step.status === 'failed'
                ? 'text-[#EF4444]'
                : 'text-gray-400',
        ]"
      >
        {{ step.label }}
      </span>
    </div>
  </div>
</template>
