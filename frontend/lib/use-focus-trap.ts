'use client'

import { useEffect, useRef } from 'react'

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isActive) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
      const container = containerRef.current
      if (!container) return

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      firstElement?.focus()

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (focusableElements.length === 0) {
          e.preventDefault()
          return
        }

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }

      container.addEventListener('keydown', handleTabKey)
      return () => {
        container.removeEventListener('keydown', handleTabKey)
        previouslyFocusedRef.current?.focus()
      }
    }
  }, [isActive])

  return containerRef
}
