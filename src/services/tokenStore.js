const ACCESS_TOKEN_KEY = 'gestartes.access_token'

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof token === 'string' && token.trim()) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token.trim())
    return
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function clearAccessToken() {
  setAccessToken(null)
}
