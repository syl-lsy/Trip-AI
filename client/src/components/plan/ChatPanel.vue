<script setup lang="ts">
import { ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import ProgressSkeleton from './ProgressSkeleton.vue'
import QuickActions from './QuickActions.vue'
import KnowledgeRefCard from './KnowledgeRefCard.vue'
import ThinkingSection from '../chat/ThinkingSection.vue'
import ToolCallSection from '../chat/ToolCallSection.vue'

const store = usePlanStore()
const inputMessage = ref('')

function sendMessage(content?: string) {
  const text = content ?? inputMessage.value.trim()
  if (!text) return
  store.startGeneration(text)
  inputMessage.value = ''
}

function handleQuickAction(text: string) {
  if (store.currentPlan) {
    store.modifyPlan(text)
  } else {
    store.startGeneration(text)
  }
}

function handleKeydown(e: { key: string; shiftKey: boolean; preventDefault: () => void }) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <aside class="w-96 bg-white border-l border-gray-200 flex flex-col">
    <div class="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
      <div
        class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-lg"
      >
        🤖
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-gray-900">童行规划师</div>
        <div class="flex items-center gap-1.5 text-xs text-gray-400">
          <span class="w-1.5 h-1.5 rounded-full bg-success inline-block" />
          <span>在线</span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      <div
        v-if="store.showWelcome"
        class="flex flex-col items-center justify-center h-full text-center px-4"
      >
        <div
          class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl mb-3"
        >
          🤖
        </div>
        <p class="text-base font-semibold text-gray-800 mb-1">你好！我是童行规划师 🧳</p>
        <p class="text-sm text-gray-400 mb-5">告诉我你的出行需求，我来帮你规划亲子行程</p>
        <QuickActions :hasPlan="!!store.currentPlan" @action="handleQuickAction" />
      </div>

      <div
        v-for="(msg, index) in store.messages"
        :key="index"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div v-if="msg.role === 'assistant'" class="max-w-[85%] space-y-2">
          <div v-if="msg.reasoning" class="w-full">
            <ThinkingSection :reasoning="msg.reasoning" />
          </div>
          <div v-if="msg.toolCalls?.length" class="w-full">
            <ToolCallSection :tools="msg.toolCalls" />
          </div>
          <div
            v-if="msg.content"
            class="px-4 py-2.5 text-sm leading-relaxed bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
          >
            {{ msg.content }}
          </div>
          <div v-if="msg.knowledgeRefs?.length" class="space-y-1">
            <KnowledgeRefCard v-for="ref in msg.knowledgeRefs" :key="ref.id" v-bind="ref" />
          </div>
        </div>
        <div
          v-else
          class="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed bg-primary text-white rounded-2xl rounded-br-sm"
        >
          {{ msg.content }}
        </div>
      </div>

      <div v-if="store.sseError" class="flex justify-center">
        <div class="text-xs text-danger bg-red-50 px-3 py-1.5 rounded-lg">
          {{ store.sseError }}
        </div>
      </div>
    </div>

    <ProgressSkeleton v-if="store.isLoading && !store.currentPlan" :steps="store.progressSteps" />

    <div class="px-4 py-3 border-t border-gray-100">
      <div class="flex items-end gap-2">
        <textarea
          v-model="inputMessage"
          rows="1"
          placeholder="输入你的需求..."
          class="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
          @keydown="handleKeydown"
        />
        <button
          class="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white text-sm flex-shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!inputMessage.trim() || store.isLoading"
          @click="sendMessage()"
        >
          &gt;
        </button>
      </div>
    </div>
  </aside>
</template>
