/**
 * @file src/hooks/useDebounce.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 * @description Hook for debouncing values, optimized to prevent excessive API calls during search/filter operations.
 * Waits for user inactivity before triggering callbacks (e.g., API searches).
 */

import { useEffect, useRef, useState } from 'react'

/**
 * Hook to debounce a value with optional callback.
 * Useful for search inputs, filter changes, and other rapid state updates.
 *
 * @template T
 * @param {T} value - The value to debounce
 * @param {number} [delay=300] - Debounce delay in milliseconds (default: 300ms as per UX best practice)
 * @param {(value: T) => void} [onDebounced] - Optional callback fired after debounce completes
 * @returns {T} The debounced value
 *
 * @example
 * const searchTerm = useDebounce(rawSearchInput, 300, (term) => {
 *   // Trigger API search only after user stops typing for 300ms
 *   fetchSearchResults(term);
 * });
 */
export function useDebounce(value, delay = 300, onDebounced) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)

      // Fire callback if provided
      if (onDebounced && typeof onDebounced === 'function') {
        onDebounced(value)
      }
    }, delay)

    // Cleanup on unmount or when value/delay changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay, onDebounced])

  return debouncedValue
}
