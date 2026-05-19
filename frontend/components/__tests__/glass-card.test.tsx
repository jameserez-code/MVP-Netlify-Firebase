import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import GlassCard from '../glass-card'

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(
      <GlassCard>
        <p>Test content</p>
      </GlassCard>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies default glass-panel class', () => {
    const { container } = render(
      <GlassCard>
        <span>Card</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('glass-panel')
    expect(card.className).toContain('p-5')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <GlassCard className="custom-class">
        <span>Card</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('custom-class')
  })

  it('applies hover class by default', () => {
    const { container } = render(
      <GlassCard>
        <span>Card</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('glass-panel-hover')
  })

  it('removes hover class when hover is false', () => {
    const { container } = render(
      <GlassCard hover={false}>
        <span>Card</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('glass-panel-hover')
  })

  it('applies animation delay via inline style', () => {
    const { container } = render(
      <GlassCard delay={0.5}>
        <span>Card</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.style.animationDelay).toBe('0.5s')
  })

  it('defaults animation delay to 0s', () => {
    const { container } = render(
      <GlassCard>
        <span>Card</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.style.animationDelay).toBe('0s')
  })

  it('renders complex nested children', () => {
    render(
      <GlassCard>
        <h2>Title</h2>
        <p>Description</p>
        <button>Action</button>
      </GlassCard>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
