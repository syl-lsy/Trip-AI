<script setup lang="ts">
import { ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import type { DayPlan } from '@/stores/plan'
import PlanComparison from './PlanComparison.vue'

const store = usePlanStore()
const activeDay = ref<number | null>(null)
const showComparison = ref(false)

function scrollToDay(day: DayPlan) {
  activeDay.value = day.day
}

function handleApplyPlan(_index: number) {
  showComparison.value = false
  // TODO: 更新行程中的交通节点
}
</script>

<template>
  <aside class="w-60 bg-white border-r border-gray-200 flex flex-col hidden lg:flex">
    <!-- Empty state -->
    <template v-if="!store.currentPlan">
      <div class="px-4 py-5">
        <h2 class="text-base font-semibold text-gray-900">行程大纲</h2>
      </div>
      <div class="flex-1 flex items-center justify-center">
        <p class="text-sm text-gray-400">暂无行程</p>
      </div>
    </template>

    <!-- Plan state -->
    <template v-if="store.currentPlan">
      <!-- Header -->
      <div class="px-4 pt-5 pb-3">
        <h3 class="font-semibold text-lg text-gray-900 truncate">
          {{ store.currentPlan.title }}
        </h3>
        <p class="text-sm text-gray-500 mt-1">
          {{ store.currentPlan.members.adults }}大{{ store.currentPlan.members.children }}小
          <template v-if="store.currentPlan.members.children > 0">
            · 孩子{{ store.currentPlan.members.childAge }}岁
          </template>
        </p>
      </div>

      <div class="mx-4 border-t border-gray-100" />

      <!-- Day navigation list -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        <button
          v-for="day in store.currentPlan.days"
          :key="'nav-' + day.day"
          class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          :class="
            activeDay === day.day
              ? 'bg-[#4A90D9]/10 text-[#4A90D9]'
              : 'text-gray-600 hover:bg-gray-50'
          "
          @click="scrollToDay(day)"
        >
          <div class="font-medium">Day {{ day.day }}</div>
          <div class="text-xs text-gray-400">{{ day.date }}</div>
        </button>
      </div>

      <!-- Bottom tool buttons -->
      <div class="flex-shrink-0 border-t border-gray-100 px-4 py-3">
        <div class="flex justify-center gap-3">
          <button
            class="text-sm text-gray-500 hover:text-primary cursor-pointer transition-colors"
            @click="showComparison = true"
          >
            方案对比
          </button>
          <button disabled class="text-sm cursor-not-allowed text-gray-300">导出行程</button>
          <button disabled class="text-sm cursor-not-allowed text-gray-300">出行清单</button>
        </div>
      </div>
    </template>
  </aside>
  <PlanComparison
    :visible="showComparison"
    @close="showComparison = false"
    @apply="handleApplyPlan"
  />
</template>
