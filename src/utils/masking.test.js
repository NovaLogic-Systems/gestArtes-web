import { describe, it, expect } from 'vitest'
import { maskEmail, maskPhone } from './masking'

describe('masking utility', () => {
  describe('maskEmail', () => {
    it('masks standard email addresses', () => {
      expect(maskEmail('test@example.com')).toBe('te**@e******.com')
    })
    
    it('handles short local parts', () => {
      expect(maskEmail('ab@example.com')).toBe('a*@e******.com')
    })
    
    it('returns empty string for invalid inputs', () => {
      expect(maskEmail('')).toBe('')
      expect(maskEmail(null)).toBe('')
    })
    
    it('returns original string if no @ present', () => {
      expect(maskEmail('invalidemail')).toBe('invalidemail')
    })
  })

  describe('maskPhone', () => {
    it('masks standard phone numbers', () => {
      expect(maskPhone('123456789')).toBe('******789')
    })
    
    it('handles numbers with spaces and special chars', () => {
      expect(maskPhone('+351 912 345 678')).toBe('*********678')
    })
    
    it('returns empty string for invalid inputs', () => {
      expect(maskPhone('')).toBe('')
      expect(maskPhone(null)).toBe('')
    })
  })
})
