/**
 * @file src/services/api.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import axios from 'axios'
import { getApiBaseUrl } from '../utils/network'

let unauthorizedHandler = null
const ACCESS_TOKEN_STORAGE_KEY = 'gestartes.access_token'

let accessToken = null

function loadAccessTokenFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function getAccessToken() {
  if (accessToken) {
    return accessToken
  }

  accessToken = loadAccessTokenFromStorage()
  return accessToken
}

export function setAccessToken(token) {
  const normalizedToken = String(token || '').trim()
  accessToken = normalizedToken || null

  if (typeof window !== 'undefined' && window.localStorage) {
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    }
  }
}

export function clearAccessToken() {
  setAccessToken(null)
}

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

let refreshPromise = null

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
