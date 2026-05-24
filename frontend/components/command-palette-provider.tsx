'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import CommandPalette from './command-palette'

interface CommandPaletteContextType {
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void
  isOpen: boolean
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined)

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openCommandPalette = useCallback(() => setIsOpen(true), [])
  const closeCommandPalette = useCallback(() => setIsOpen(false), [])
  const toggleCommandPalette = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  return (
    <CommandPaletteContext.Provider value={{ openCommandPalette, closeCommandPalette, toggleCommandPalette, isOpen }}>
      {children}
      <CommandPalette open={isOpen} onClose={closeCommandPalette} />
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  return ctx
}
