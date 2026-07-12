<script setup lang="ts">
import { useRouter } from 'vue-router'

interface Props {
  id: string
  title: string
}

defineProps<Props>()

const router = useRouter()

function handleClick(id: string) {
  router.push(`/knowledge/${id}`)
}
</script>

<template>
  <div
    class="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
    @click="handleClick(id)"
  >
    <span class="text-sm">📖</span>
    <div>
      <p class="text-sm font-medium text-blue-700">{{ title }}</p>
      <p class="text-xs text-blue-500">来源：童行亲子知识库</p>
    </div>
  </div>
</template>
