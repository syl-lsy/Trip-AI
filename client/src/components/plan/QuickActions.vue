<script setup lang="ts">
interface Props {
  hasPlan?: boolean
}

interface Emits {
  (e: 'action', text: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

interface QuickActionItem {
  emoji: string
  label: string
  text: string
  requiresPlan: boolean
}

const actions: QuickActionItem[] = [
  { emoji: '🐢', label: '放慢行程节奏', text: '放慢行程节奏', requiresPlan: true },
  { emoji: '🏨', label: '更换亲子酒店', text: '更换亲子酒店', requiresPlan: true },
  { emoji: '💰', label: '压缩预算', text: '压缩预算', requiresPlan: false },
  { emoji: '🍽️', label: '增加美食推荐', text: '增加美食推荐', requiresPlan: false },
]
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="action in actions"
      :key="action.text"
      class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-gray-50 hover:bg-[#4A90D9]/10 border border-gray-200 hover:border-[#4A90D9]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      :disabled="action.requiresPlan && !hasPlan"
      @click="emit('action', action.text)"
    >
      {{ action.emoji }} {{ action.label }}
    </button>
  </div>
</template>
