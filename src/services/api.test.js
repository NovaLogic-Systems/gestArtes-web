import { beforeEach, describe, expect, test, vi } from 'vitest'

const createMock = vi.fn()
const toastErrorMock = vi.fn()
let responseErrorHandler = null

vi.mock('axios', () => ({
  default: {
    create: createMock,
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}))

vi.mock('../utils/network', () => ({
  getApiBaseUrl: () => '/api',
}))

function setupAxiosMocks() {
  responseErrorHandler = null

  const apiInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((_success, error) => {
          responseErrorHandler = error
        }),
      },
    },
  }

  const refreshInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    post: vi.fn(),
  }

  createMock.mockImplementationOnce(() => apiInstance).mockImplementationOnce(() => refreshInstance)
}

async function loadApiModule() {
  await import('./api')
}

describe('api interceptor global error toast', () => {
  beforeEach(() => {
    vi.resetModules()
    createMock.mockReset()
    toastErrorMock.mockReset()
  })

  test('shows toast on network error', async () => {
    setupAxiosMocks()
    await loadApiModule()

    await responseErrorHandler({ response: undefined, config: {} })

    expect(toastErrorMock).toHaveBeenCalledWith('Erro inesperado. Tenta novamente.')
  })

  test('shows toast on 5xx error', async () => {
    setupAxiosMocks()
    await loadApiModule()

    await responseErrorHandler({ response: { status: 500 }, config: {} })

    expect(toastErrorMock).toHaveBeenCalledWith('Erro inesperado. Tenta novamente.')
  })

  test('does not show toast on 4xx error', async () => {
    setupAxiosMocks()
    await loadApiModule()

    await responseErrorHandler({ response: { status: 404 }, config: {} })

    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  test('does not show toast for canceled requests', async () => {
    setupAxiosMocks()
    await loadApiModule()

    await responseErrorHandler({ code: 'ERR_CANCELED', response: undefined, config: {} })

    expect(toastErrorMock).not.toHaveBeenCalled()
  })
})
