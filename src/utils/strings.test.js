import { describe, it, expect } from 'vitest'
import { uniqueNames } from './strings'

describe('strings utility', () => {
  describe('uniqueNames', () => {
    it('returns unique normalized names sorted alphabetically', () => {
      expect(uniqueNames(['Alice', 'Bob', 'alice', '  BOB  ', 'Charlie'])).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('returns empty array if input is not an array', () => {
      expect(uniqueNames(null)).toEqual([])
      expect(uniqueNames('not an array')).toEqual([])
    })

    it('ignores empty or whitespace strings', () => {
      expect(uniqueNames(['Alice', ' ', '', 'Bob'])).toEqual(['Alice', 'Bob'])
    })
  })
})
