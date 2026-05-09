import { render, screen } from '@testing-library/react'
import WithRole from './WithRole'
import withRole from './withRoleHOC'
import * as authHook from '../hooks/useAuth'

function DummyComponent({ text }) {
  return <p>{text}</p>
}

describe('WithRole', () => {
  test('renders children when role is allowed', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      role: 'Direction',
      user: null,
    })

    render(
      <WithRole roles={['admin']}>
        <p>Allowed Content</p>
      </WithRole>
    )

    expect(screen.getByText('Allowed Content')).toBeTruthy()
  })

  test('renders fallback when role is not allowed', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      role: 'student',
      user: null,
    })

    render(
      <WithRole roles={['admin']} fallback={<p>Forbidden</p>}>
        <p>Allowed Content</p>
      </WithRole>
    )

    expect(screen.getByText('Forbidden')).toBeTruthy()
    expect(screen.queryByText('Allowed Content')).toBeNull()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})

describe('withRole', () => {
  test('renders wrapped component when role is allowed', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      role: 'Management',
      user: null,
    })

    const ProtectedComponent = withRole(DummyComponent, ['admin'])
    render(<ProtectedComponent text="Allowed Content" />)

    expect(screen.getByText('Allowed Content')).toBeTruthy()
  })

  test('renders fallback when role is not allowed', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      role: 'teacher',
      user: null,
    })

    const ProtectedComponent = withRole(DummyComponent, ['admin'], <p>Forbidden</p>)
    render(<ProtectedComponent text="Allowed Content" />)

    expect(screen.getByText('Forbidden')).toBeTruthy()
    expect(screen.queryByText('Allowed Content')).toBeNull()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
