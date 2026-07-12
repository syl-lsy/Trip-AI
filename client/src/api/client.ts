import axios from 'axios'
import { API_PREFIX, HTTP_STATUS, CONTENT_TYPE, TIMEOUT, ROUTES, STORAGE_KEYS } from '@trip/shared'
import type { ApiResponse } from './types'

const http = axios.create({
  baseURL: API_PREFIX,
  timeout: TIMEOUT.DEFAULT_API,
  headers: { 'Content-Type': CONTENT_TYPE.JSON },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      window.location.href = ROUTES.LOGIN
    }
    return Promise.reject(error)
  },
)

export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  const { data } = await http.get<ApiResponse<T>>(url, { params })
  return data
}

export async function post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await http.post<ApiResponse<T>>(url, body)
  return data
}

export async function put<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  const { data } = await http.put<ApiResponse<T>>(url, body)
  return data
}

export async function del<T>(url: string): Promise<ApiResponse<T>> {
  const { data } = await http.delete<ApiResponse<T>>(url)
  return data
}

export default http
