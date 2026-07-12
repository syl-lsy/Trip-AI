import { defineStore } from 'pinia'
import { ref } from 'vue'
import { STORAGE_KEYS, ROUTES } from '@trip/shared'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEYS.TOKEN))
  const isLoggedIn = ref(!!token.value)

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken
    user.value = newUser
    isLoggedIn.value = true
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
  }

  function logout() {
    token.value = null
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    window.location.href = ROUTES.LOGIN
  }

  return { user, token, isLoggedIn, setAuth, logout }
})
