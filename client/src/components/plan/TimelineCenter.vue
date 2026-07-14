<script setup lang="ts">
import { usePlanStore } from '@/stores/plan'
import DayCard from './DayCard.vue'

const store = usePlanStore()

const quickExamples = ['去三亚5天，2大1小', '去云南6天，预算8000', '上海周边周末游', '成都亲子游']

const LEGEND_ITEMS = [
  { emoji: '🚗', label: '交通' },
  { emoji: '🏔️', label: '景点' },
  { emoji: '🍽️', label: '餐饮' },
  { emoji: '🏨', label: '住宿' },
  { emoji: '😴', label: '休息' },
]

function sendExample(content: string) {
  store.startGeneration(content)
}
</script>

<template>
  <div class="flex-1 flex flex-col bg-gray-50/50 min-w-0">
    <!-- Empty state -->
    <div
      v-if="!store.currentPlan && store.showWelcome"
      class="flex-1 flex items-center justify-center"
    >
      <div class="text-center px-6">
        <div class="text-6xl mb-4">🗺️</div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">开始规划你的亲子之旅</h2>
        <p class="text-sm text-gray-400 mb-6">在右侧对话框输入你的出行需求</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="example in quickExamples"
            :key="example"
            class="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#4A90D9] hover:text-[#4A90D9] transition-colors cursor-pointer"
            @click="sendExample(example)"
          >
            {{ example }}
          </button>
        </div>
      </div>
    </div>

    <!-- Plan view -->
    <template v-if="store.currentPlan">
      <!-- Overview bar -->
      <div class="bg-white border-b border-gray-200 flex-shrink-0">
        <!-- Title + Score + Budget row -->
        <div class="flex items-center justify-between px-6 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <h1 class="text-lg font-semibold text-gray-900 truncate">
              {{ store.currentPlan.title }}
            </h1>
            <span class="text-sm text-gray-400 truncate">{{ store.currentPlan.destination }}</span>
          </div>

          <div class="flex items-center gap-6">
            <div class="flex items-center gap-1.5">
              <span class="text-lg">⭐</span>
              <span class="text-lg font-bold" style="color: #f5a623">
                {{ store.currentPlan.kidFriendlyScore }}
              </span>
              <span class="text-xs text-gray-400">亲子度</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-lg font-bold text-gray-900"
                >¥{{ store.currentPlan.budget.total }}</span
              >
              <span class="text-xs text-gray-400">预估</span>
            </div>
          </div>
        </div>

        <!-- Legend row -->
        <div class="flex items-center gap-1 px-6 pb-3">
          <div
            v-for="item in LEGEND_ITEMS"
            :key="item.label"
            class="flex items-center gap-1 text-xs text-gray-400 mr-3"
          >
            <span>{{ item.emoji }}</span>
            <span>{{ item.label }}</span>
          </div>
          <div class="flex-1" />
          <button
            disabled
            class="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-300 cursor-not-allowed"
          >
            导出 PDF
          </button>
        </div>
      </div>

      <!-- Day cards scrollable area -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <DayCard
          v-for="(day, idx) in store.currentPlan.days"
          :key="'day-' + day.day"
          :day="day"
          :is-today="idx === 0"
        />
      </div>
    </template>
  </div>
</template>
