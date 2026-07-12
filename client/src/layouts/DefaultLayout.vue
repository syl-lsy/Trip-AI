<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/plan', label: '智能规划', icon: '🗺️' },
  { path: '/knowledge', label: '亲子知识库', icon: '📚' },
  { path: '/destinations', label: '目的地', icon: '📍' },
  { path: '/itineraries', label: '我的行程', icon: '📋' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]
</script>

<template>
  <div class="min-h-screen bg-bg-base">
    <header class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <RouterLink to="/plan" class="flex items-center gap-2 no-underline">
            <span
              class="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-lg font-bold"
            >
              童
            </span>
            <span class="text-lg font-semibold text-gray-900">童行AI</span>
          </RouterLink>
          <nav class="hidden md:flex items-center gap-1">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="
                route.path.startsWith(item.path)
                  ? 'text-primary bg-primary/5'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              "
            >
              {{ item.icon }} {{ item.label }}
            </RouterLink>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink
            to="/profile"
            class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm no-underline"
          >
            👤
          </RouterLink>
        </div>
      </div>
    </header>
    <main class="max-w-7xl mx-auto p-4">
      <RouterView />
    </main>
  </div>
</template>
