'use client'

export function Tooltip({ content, children, shortcut }: { content: string; children: React.ReactNode; shortcut?: string }) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
        <div className="bg-passport-surface-2 border border-passport-border rounded-passport px-2.5 py-1.5 text-xs font-mono text-passport-text whitespace-nowrap shadow-lg">
          {content}
          {shortcut && <span className="ml-2 text-passport-dim">{shortcut}</span>}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-passport-surface-2 border-b border-r border-passport-border rotate-45" />
      </div>
    </div>
  )
}
