import axios, { type AxiosInstance } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ===== REQUEST INTERCEPTOR =====
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ===== TOKEN REFRESH =====
let isRefreshing = false

let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}> = []

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config

    // ===== HANDLE 401 =====
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        )

        const { accessToken } = data.data

        useAuthStore
          .getState()
          .setAuth(useAuthStore.getState().user!, accessToken)

        failedQueue.forEach(({ resolve }) => resolve(accessToken))

        failedQueue = []

        originalRequest.headers.Authorization = `Bearer ${accessToken}`

        return api(originalRequest)
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError))

        failedQueue = []

        useAuthStore.getState().clearAuth()

        window.location.href = '/login'

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // ===== ERROR TOAST =====
    const message =
      error.response?.data?.message || 'Something went wrong'

    if (error.response?.status !== 401) {
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

export default api