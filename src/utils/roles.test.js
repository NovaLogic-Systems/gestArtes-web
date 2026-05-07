import { toAppRole } from './roles'

describe('toAppRole', () => {
  test('maps Direction to admin', () => {
    expect(toAppRole('Direction')).toBe('admin')
  })

  test('maps Direcao to admin', () => {
    expect(toAppRole('Direção')).toBe('admin')
  })

  test('maps Management to admin', () => {
    expect(toAppRole('Management')).toBe('admin')
  })
})
