<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'apply', planIndex: number): void
}

defineProps<Props>()

const emit = defineEmits<Emits>()

interface TransportOption {
  id: string
  time: string
  price: number
}

interface PlanOption {
  id: string
  label: string
  recommended: boolean
  trains: TransportOption[]
  flights: TransportOption[]
  selectedTrain: number
  selectedFlight: number
}

const plans = ref<PlanOption[]>([
  {
    id: 'A',
    label: '上海虹桥出发',
    recommended: true,
    trains: [
      { id: 'G1234', time: '07:00-09:00', price: 200 },
      { id: 'G5678', time: '08:30-10:30', price: 250 },
    ],
    flights: [
      { id: 'MU123', time: '10:00-12:00', price: 600 },
      { id: 'CA456', time: '14:00-16:00', price: 800 },
    ],
    selectedTrain: 0,
    selectedFlight: 0,
  },
  {
    id: 'B',
    label: '无锡硕放出发',
    recommended: false,
    trains: [
      { id: 'D1234', time: '06:30-11:00', price: 150 },
      { id: 'D5678', time: '09:00-13:30', price: 180 },
    ],
    flights: [{ id: 'CZ789', time: '11:00-13:00', price: 550 }],

    selectedTrain: 0,
    selectedFlight: 0,
  },
])

const PEOPLE_COUNT = 3

function totalCost(plan: PlanOption): number {
  const train = plan.trains[plan.selectedTrain]
  const flight = plan.flights[plan.selectedFlight]
  return (train.price + flight.price) * PEOPLE_COUNT
}

function selectTrain(planIndex: number, trainIndex: number) {
  plans.value[planIndex].selectedTrain = trainIndex
}

function selectFlight(planIndex: number, flightIndex: number) {
  plans.value[planIndex].selectedFlight = flightIndex
}

function handleApply(planIndex: number) {
  emit('apply', planIndex)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/30" />

      <!-- Modal body -->
      <div
        class="relative w-full max-w-[640px] bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 class="text-lg font-semibold text-gray-900">出行方案对比</h2>
          <button
            class="text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
            @click="emit('close')"
          >
            ✕ 关闭
          </button>
        </div>

        <!-- Plan cards -->
        <div class="overflow-y-auto px-6 pb-6 space-y-4">
          <div
            v-for="(plan, pIdx) in plans"
            :key="plan.id"
            class="rounded-xl border p-5 relative transition-shadow"
            :class="
              plan.recommended
                ? 'border-primary/30 bg-primary/5 shadow-card'
                : 'border-gray-200 bg-white shadow-sm'
            "
          >
            <!-- Recommended badge -->
            <div
              v-if="plan.recommended"
              class="absolute -top-3 left-4 bg-primary text-white text-xs font-semibold px-3 py-0.5 rounded-full"
            >
              ⭐ 推荐
            </div>

            <h3 class="font-semibold text-gray-900 mb-1">{{ plan.label }}</h3>

            <!-- Trains -->
            <div class="mt-3">
              <p class="text-xs text-gray-500 font-medium mb-1.5">高铁:</p>
              <label
                v-for="(t, tIdx) in plan.trains"
                :key="t.id"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                :class="
                  plan.selectedTrain === tIdx
                    ? 'bg-primary/8 text-primary'
                    : 'hover:bg-gray-50 text-gray-700'
                "
              >
                <input
                  type="radio"
                  :name="'train-' + plan.id"
                  class="accent-primary"
                  :checked="plan.selectedTrain === tIdx"
                  @change="selectTrain(pIdx, tIdx)"
                />
                <span class="text-sm">○ {{ t.id }} {{ t.time }} ¥{{ t.price }}/人</span>
              </label>
            </div>

            <!-- Flights -->
            <div class="mt-2">
              <p class="text-xs text-gray-500 font-medium mb-1.5">航班:</p>
              <label
                v-for="(f, fIdx) in plan.flights"
                :key="f.id"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                :class="
                  plan.selectedFlight === fIdx
                    ? 'bg-primary/8 text-primary'
                    : 'hover:bg-gray-50 text-gray-700'
                "
              >
                <input
                  type="radio"
                  :name="'flight-' + plan.id"
                  class="accent-primary"
                  :checked="plan.selectedFlight === fIdx"
                  @change="selectFlight(pIdx, fIdx)"
                />
                <span class="text-sm">○ {{ f.id }} {{ f.time }} ¥{{ f.price }}/人</span>
              </label>
            </div>

            <!-- Total -->
            <div class="mt-3 text-sm text-gray-900 font-medium">
              三人交通合计：¥{{ totalCost(plan) }}
            </div>

            <!-- Apply button -->
            <button
              class="mt-3 w-full py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              :class="
                plan.recommended
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              "
              @click="handleApply(pIdx)"
            >
              应用此方案
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
