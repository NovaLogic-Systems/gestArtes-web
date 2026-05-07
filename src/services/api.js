/**
 * @file src/services/api.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import axios from 'axios'
import { getApiBaseUrl } from '../utils/network'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from './tokenStore'

let unauthorizedHandler = null
let refreshPromise = null

export { clearAccessToken, getAccessToken, setAccessToken }

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
})

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh', null, { skipAuthHandler: true })
      .then((response) => {
        const nextAccessToken = response?.data?.accessToken || null

        if (!nextAccessToken) {
          throw new Error('Access token missing on refresh response')
        }

        setAccessToken(nextAccessToken)
        return nextAccessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const statusCode = error?.response?.status
    const requestUrl = String(error?.config?.url || '')
    const skipAuthHandler = Boolean(error?.config?.skipAuthHandler)
    const isRefreshRequest = requestUrl.includes('/auth/refresh')
    const isLoginRequest = requestUrl.includes('/auth/login')
    const alreadyRetried = Boolean(error?.config?._retry)

    const shouldAttemptRefresh =
      statusCode === 401 &&
      !skipAuthHandler &&
      !isRefreshRequest &&
      !isLoginRequest &&
      !alreadyRetried

    if (shouldAttemptRefresh) {
      try {
        const nextAccessToken = await refreshAccessToken()
        const nextConfig = {
          ...error.config,
          _retry: true,
          headers: {
            ...(error.config?.headers || {}),
            Authorization: `Bearer ${nextAccessToken}`,
          },
        }

        return api(nextConfig)
      } catch {
        clearAccessToken()
      }
    }

    const shouldHandleUnauthorized =
      statusCode === 401 &&
      unauthorizedHandler &&
      !skipAuthHandler &&
      !isLoginRequest &&
      !isRefreshRequest

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
