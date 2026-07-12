<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProfileDetail } from '../api/user'
import type { UserProfileDetail } from '../api/user'

const profile = ref<UserProfileDetail | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getProfileDetail()
    if (res.success && res.data) {
      profile.value = res.data
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-md mx-auto mt-10">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-6">个人资料</h2>
      <div v-if="loading" class="text-gray-400 text-sm">加载中...</div>
      <div v-else-if="profile" class="space-y-4">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-500 w-16 text-sm">手机号</span>
          <span class="text-gray-900 font-medium">{{ profile.phone }}</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span class="text-gray-500 w-16 text-sm">昵称</span>
          <span class="text-gray-900 font-medium">{{ profile.nickname ?? '未设置' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
