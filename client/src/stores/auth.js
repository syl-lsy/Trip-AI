import { defineStore } from 'pinia'
import { ref } from 'vue'
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const isLoggedIn = ref(!!token.value)
  function setAuth(newToken, newUser) {
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
//# sourceMappingURL=auth.js.map
