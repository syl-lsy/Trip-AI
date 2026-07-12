import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoggedIn = ref(!!token.value)

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken
    user.value = newUser
    isLoggedIn.value = true
    localStorage.setItem('token', newToken)
  }

  function logout() {
    token.value = null
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return { user, token, isLoggedIn, setAuth, logout }
})
