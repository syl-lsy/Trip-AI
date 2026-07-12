<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { sendCode, login } from '../api/auth'

const router = useRouter()
const authStore = useAuthStore()

const phone = ref('')
const code = ref('')
const codeSent = ref(false)
const loading = ref(false)
const error = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof globalThis.setInterval> | null = null

const DEMO_USERS = [
  { label: '亲子用户1', phone: '15250092360', code: '123456' },
  { label: '亲子用户2', phone: '15370980317', code: '123456' },
  { label: '运营管理员', phone: '13900139000', code: 'admin666' },
]

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (!phone.value) return
  loading.value = true
  error.value = ''
  try {
    await sendCode(phone.value)
    codeSent.value = true
    startCountdown()
  } catch {
    error.value = '发送验证码失败'
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  if (!phone.value || !code.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await login(phone.value, code.value)
    authStore.setAuth(res.data!.token, res.data!.user)
    router.push('/plan')
  } catch {
    error.value = '验证码错误或已过期'
  } finally {
    loading.value = false
  }
}

function fillDemo(demo: (typeof DEMO_USERS)[number]) {
  phone.value = demo.phone
  code.value = demo.code
  codeSent.value = true
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 rounded-xl bg-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4"
        >
          童
        </div>
        <h1 class="text-2xl font-semibold text-gray-900">童行AI</h1>
        <p class="text-gray-500 mt-1">亲子旅游智能规划平台</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">手机号</label>
          <input
            v-model="phone"
            type="tel"
            maxlength="11"
            placeholder="请输入手机号"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">验证码</label>
          <div class="flex gap-2">
            <input
              v-model="code"
              type="text"
              maxlength="20"
              placeholder="请输入验证码"
              class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              :disabled="loading || countdown > 0"
              class="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium whitespace-nowrap hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <button
          :disabled="loading || !phone || !code"
          class="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div v-if="error" class="text-red-500 text-sm text-center">{{ error }}</div>
      </div>

      <div class="mt-6">
        <p class="text-sm text-gray-500 text-center mb-3">快速体验</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="demo in DEMO_USERS"
            :key="demo.phone"
            class="px-3 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors text-left"
            @click="fillDemo(demo)"
          >
            <div class="font-medium text-gray-900">{{ demo.label }}</div>
            <div class="text-gray-400 text-xs mt-0.5">{{ demo.phone }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
