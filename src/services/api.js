import axios from 'axios'

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error?.response?.status
    const requestUrl = String(error?.config?.url || '')
    const skipAuthHandler = Boolean(error?.config?.skipAuthHandler)

    const shouldHandleUnauthorized =
      statusCode === 401 &&
      unauthorizedHandler &&
      !skipAuthHandler &&
      !requestUrl.includes('/auth/login')

    if (shouldHandleUnauthorized) {
      unauthorizedHandler({
        statusCode,
        requestUrl,
      })
    }

    return Promise.reject(error)
  },
)

export default api
