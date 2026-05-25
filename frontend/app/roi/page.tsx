'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import {
  Calculator,
  DollarSign,
  Users,
  AlertTriangle,
  Shield,
  Building2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Check,
  Zap,
  Clock,
} from 'lucide-react'

const formatCurrency = (val: number) =>
  '$' + Math.round(val).toLocaleString()

const formatShortCurrency = (val: number) => {
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'M'
  if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'K'
  return '$' + Math.round(val).toLocaleString()
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  prefix = '',
  suffix = '',
  description,
  formatValue,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  description?: string
  formatValue?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value))
    },
    [onChange]
  )

  const handleDecrement = useCallback(() => {
    onChange(Math.max(min, value - step))
  }, [onChange, value, min, step])

  const handleIncrement = useCallback(() => {
    onChange(Math.min(max, value + step))
  }, [onChange, value, max, step])

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-passport-text">{label}</label>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDecrement}
            className="w-7 h-7 flex items-center justify-center rounded border border-passport-border bg-passport-surface hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors"
            aria-label={`Decrease ${label}`}
          >
            <span className="text-xs font-bold">−</span>
          </button>
          <span className="w-24 text-center font-mono text-sm font-semibold text-passport-green">
            {prefix}
            {formatValue ? formatValue(value) : value.toLocaleString()}
            {suffix}
          </span>
          <button
            onClick={handleIncrement}
            className="w-7 h-7 flex items-center justify-center rounded border border-passport-border bg-passport-surface hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors"
            aria-label={`Increase ${label}`}
          >
            <span className="text-xs font-bold">+</span>
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #2ea043 ${pct}%, #30363d ${pct}%)`,
          accentColor: '#2ea043',
        }}
      />
      {description && (
        <p className="text-[11px] text-passport-dim mt-1">{description}</p>
      )}
    </div>
  )
}

export default function ROIPage() {
  const [numAgents, setNumAgents] = useState(5)
  const [devRate, setDevRate] = useState(150)
  const [costPerIncident, setCostPerIncident] = useState(47000)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const currentYear = useMemo(() => new Date().getFullYear(), [])

  const ingWeeks = useMemo(() => {
    if (numAgents <= 3) return 4
    if (numAgents <= 10) return 5
    if (numAgents <= 25) return 6
    if (numAgents <= 50) return 7
    return 8
  }, [numAgents])

  const incidentsPerYear = useMemo(() => {
    if (numAgents <= 3) return 3
    if (numAgents <= 10) return 5
    if (numAgents <= 25) return 8
    if (numAgents <= 50) return 10
    return 12
  }, [numAgents])

  const buildCost = useMemo(
    () => numAgents * devRate * ingWeeks * 40,
    [numAgents, devRate, ingWeeks]
  )

  const annualMaintenance = useMemo(() => buildCost * 0.2, [buildCost])

  const incidentCostSaved = useMemo(
    () => costPerIncident * incidentsPerYear * 0.95,
    [costPerIncident, incidentsPerYear]
  )

  const year1InHouse = useMemo(
    () => buildCost + annualMaintenance + costPerIncident * incidentsPerYear,
    [buildCost, annualMaintenance, costPerIncident, incidentsPerYear]
  )

  const year1PassportPro = 348

  const totalSavings = useMemo(
    () => year1InHouse - year1PassportPro,
    [year1InHouse]
  )

  const engineeringSavings = useMemo(
    () => buildCost + annualMaintenance,
    [buildCost, annualMaintenance]
  )

  const ratePresets = [
    { label: 'US', rate: 200 },
    { label: 'EU', rate: 120 },
    { label: 'India', rate: 50 },
  ]

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/15 bg-passport-green/5 text-passport-green text-xs font-mono mb-6">
              <Calculator size={14} />
              ROI Calculator
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-passport-text tracking-tight mb-3">
              ROI Calculator
            </h1>
            <p className="text-lg text-passport-muted max-w-xl mx-auto">
              See how much you save with pre-built agent enforcement vs building it yourself
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Calculator Form */}
            <GlassCard className="p-6 sm:p-8" hover={false}>
              <h2 className="text-sm font-mono uppercase tracking-widest text-passport-dim mb-6">
                Configure Your Scenario
              </h2>

              <SliderField
                label="Number of AI agents deployed"
                value={numAgents}
                min={1}
                max={100}
                onChange={setNumAgents}
                description="The more agents, the more complex the in-house build"
              />

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-passport-text">
                    Developer hourly rate
                  </label>
                  <span className="font-mono text-sm font-semibold text-passport-green">
                    ${devRate}/hr
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  {ratePresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setDevRate(preset.rate)}
                      className={`px-3 py-1 text-xs font-mono rounded border transition-all ${
                        devRate === preset.rate
                          ? 'border-passport-green/40 bg-passport-green/10 text-passport-green'
                          : 'border-passport-border bg-passport-surface text-passport-muted hover:text-passport-text hover:border-passport-border-2'
                      }`}
                    >
                      {preset.label} (${preset.rate})
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={10}
                  value={devRate}
                  onChange={(e) => setDevRate(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #2ea043 ${((devRate - 50) / 250) * 100}%, #30363d ${((devRate - 50) / 250) * 100}%)`,
                    accentColor: '#2ea043',
                  }}
                />
                <p className="text-[11px] text-passport-dim mt-1">
                  Blended rate for senior + mid-level engineers
                </p>
              </div>

              <div className="p-4 rounded-md border border-passport-border bg-passport-surface/50 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-passport-amber" />
                  <span className="text-sm font-medium text-passport-text">
                    Engineering weeks to build in-house
                  </span>
                </div>
                <div className="font-mono text-2xl font-bold text-passport-text mb-3">
                  {ingWeeks} weeks
                </div>
                <div className="space-y-1.5 text-xs text-passport-muted">
                  <div className="flex justify-between">
                    <span>Policy engine + rule evaluator</span>
                    <span className="font-mono text-passport-dim">2-3 weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agent registration + secret mgmt</span>
                    <span className="font-mono text-passport-dim">1-2 weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit logging + dashboard</span>
                    <span className="font-mono text-passport-dim">1-2 weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Testing, docs, deployment</span>
                    <span className="font-mono text-passport-dim">1 week</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-md border border-passport-border bg-passport-surface/50 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-passport-text">
                    Monthly maintenance cost
                  </span>
                  <span className="font-mono text-sm font-semibold text-passport-amber">
                    {formatCurrency(annualMaintenance / 12)}/mo
                  </span>
                </div>
                <p className="text-[11px] text-passport-dim">
                  20% of initial build cost annually — for updates, bug fixes, security patches
                </p>
              </div>

              <SliderField
                label="Average cost per AI incident"
                value={costPerIncident}
                min={1000}
                max={500000}
                step={1000}
                onChange={setCostPerIncident}
                formatValue={formatShortCurrency}
                description="Based on industry averages: data breach = $4.45M, minor incident = $1K-$50K"
              />

              <div className="p-4 rounded-md border border-passport-border bg-passport-surface/50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-passport-coral" />
                  <span className="text-sm font-medium text-passport-text">
                    Incidents prevented per year
                  </span>
                </div>
                <div className="font-mono text-2xl font-bold text-passport-text mb-1">
                  {incidentsPerYear}
                </div>
                <p className="text-[11px] text-passport-dim">
                  Estimated incidents without enforcement, based on {numAgents} agents in production
                </p>
              </div>
            </GlassCard>

            {/* Results */}
            <div className="space-y-6">
              {/* Savings Highlight */}
              <div
                className="glass-panel p-6 sm:p-8 text-center border-passport-green/30"
                style={{
                  boxShadow: '0 0 24px rgba(46,160,67,0.08), 0 0 48px rgba(46,160,67,0.03)',
                }}
              >
                <p className="text-xs font-mono uppercase tracking-widest text-passport-dim mb-3">
                  Year 1 Estimated Savings
                </p>
                <div className="text-4xl sm:text-5xl font-bold text-passport-green font-mono mb-3">
                  {formatSavingsShort(totalSavings)}
                </div>
                <div className="space-y-1 text-sm text-passport-muted">
                  <p>
                    <span className="text-passport-text font-semibold">
                      {formatCurrency(engineeringSavings)}
                    </span>{' '}
                    in engineering costs
                  </p>
                  <p>
                    +{' '}
                    <span className="text-passport-text font-semibold">
                      {formatCurrency(incidentCostSaved)}
                    </span>{' '}
                    in prevented incidents
                  </p>
                </div>
              </div>

              {/* Comparison Table */}
              <GlassCard hover={false} className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-passport-border">
                      <th className="text-left py-3 px-4 text-xs font-mono uppercase tracking-wider text-passport-dim">
                        &nbsp;
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono uppercase tracking-wider text-passport-dim">
                        Build In-House
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono uppercase tracking-wider text-passport-green">
                        Passport Pro
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-mono uppercase tracking-wider text-passport-dim">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-passport-border/50">
                    <tr>
                      <td className="py-2.5 px-4 text-passport-muted">Initial Setup</td>
                      <td className="py-2.5 px-4 text-passport-text font-mono">
                        {formatCurrency(buildCost)} ({ingWeeks} weeks)
                      </td>
                      <td className="py-2.5 px-4 text-passport-green font-mono">
                        $0 (30 minutes)
                      </td>
                      <td className="py-2.5 px-4 text-passport-muted font-mono">
                        $0 (30 minutes)
                      </td>
                    </tr>
                    <tr className="bg-passport-surface/30">
                      <td className="py-2.5 px-4 text-passport-muted">Annual Cost</td>
                      <td className="py-2.5 px-4 text-passport-text font-mono">
                        {formatCurrency(annualMaintenance)}
                      </td>
                      <td className="py-2.5 px-4 text-passport-green font-mono">
                        $348/year
                      </td>
                      <td className="py-2.5 px-4 text-passport-muted font-mono">
                        Custom
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-passport-muted">
                        Incident Prevention
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-passport-coral text-xs font-mono">
                          None
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-passport-green text-xs font-mono">
                          95% reduction
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-passport-green text-xs font-mono">
                          99% reduction
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-passport-surface/30">
                      <td className="py-2.5 px-4 text-passport-muted">Compliance Ready</td>
                      <td className="py-2.5 px-4">
                        <span className="text-passport-coral text-xs font-mono">
                          No
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-passport-green text-xs font-mono">
                          Yes
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-passport-green text-xs font-mono">
                          Yes + SOC 2
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-passport-text font-semibold">
                        Year 1 Total
                      </td>
                      <td className="py-2.5 px-4 text-passport-text font-mono font-bold">
                        {formatCurrency(year1InHouse)}
                      </td>
                      <td className="py-2.5 px-4 text-passport-green font-mono font-bold">
                        $348
                      </td>
                      <td className="py-2.5 px-4 text-passport-muted font-mono">
                        Custom
                      </td>
                    </tr>
                  </tbody>
                </table>
              </GlassCard>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="btn-primary text-base px-8 py-3.5 flex-1 justify-center btn-glow-hover"
                >
                  <Zap size={16} />
                  Start Free Trial
                </Link>
                <Link
                  href="/login"
                  className="btn-secondary text-base px-8 py-3.5 flex-1 justify-center"
                >
                  <Building2 size={16} />
                  Talk to Sales
                </Link>
              </div>
              <div className="text-center">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-1.5 text-sm text-passport-green hover:text-passport-text transition-colors font-mono"
                >
                  Schedule a Demo
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Methodology */}
          <div className="mt-12 max-w-3xl mx-auto">
            <button
              onClick={() => setMethodologyOpen(!methodologyOpen)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-md border border-passport-border hover:border-passport-border-2 transition-colors bg-passport-surface/30"
            >
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-passport-green" />
                <span className="text-sm font-medium text-passport-text">
                  How these numbers are calculated
                </span>
              </div>
              {methodologyOpen ? (
                <ChevronUp size={16} className="text-passport-muted" />
              ) : (
                <ChevronDown size={16} className="text-passport-muted" />
              )}
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: methodologyOpen ? '500px' : '0px' }}
            >
              <div className="px-5 py-4 space-y-3 text-sm text-passport-muted leading-relaxed">
                <div>
                  <h4 className="text-passport-text font-medium mb-1">
                    Engineering cost
                  </h4>
                  <p className="font-mono text-xs text-passport-dim">
                    Number of agents &times; Developer hourly rate &times; Engineering
                    weeks &times; 40 hours/week
                  </p>
                  <p className="mt-1">
                    {numAgents} agents &times; ${devRate}/hr &times; {ingWeeks} weeks
                    &times; 40 hrs = {formatCurrency(buildCost)}
                  </p>
                </div>
                <div>
                  <h4 className="text-passport-text font-medium mb-1">
                    Incident cost
                  </h4>
                  <p className="font-mono text-xs text-passport-dim">
                    Average cost per incident &times; Incidents per year &times; 95%
                    prevention rate
                  </p>
                  <p className="mt-1">
                    {formatShortCurrency(costPerIncident)} &times; {incidentsPerYear}{' '}
                    incidents &times; 95% = {formatCurrency(incidentCostSaved)} saved
                  </p>
                </div>
                <div>
                  <h4 className="text-passport-text font-medium mb-1">
                    Annual maintenance
                  </h4>
                  <p className="font-mono text-xs text-passport-dim">
                    20% of initial build cost
                  </p>
                  <p className="mt-1">
                    20% &times; {formatCurrency(buildCost)} ={' '}
                    {formatCurrency(annualMaintenance)}/year
                  </p>
                </div>
                <div>
                  <h4 className="text-passport-text font-medium mb-1">
                    Sources
                  </h4>
                  <p>
                    Engineering time estimates based on industry surveys of teams building
                    internal agent governance. Incident costs based on IBM Cost of a Data
                    Breach Report 2023 ($4.45M avg), scaled down for AI-specific incidents.
                    Maintenance rate of 20% is standard across enterprise software.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 relative mt-16">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(46,160,67,0.15), transparent)',
          }}
        />
        <div className="max-w-5xl mx-auto pt-4 text-center">
          <p className="font-mono text-[10px] text-passport-dim tracking-wider">
            {'\u00A9'} {currentYear} Passport Agent {'\u00B7'} ROI estimates are
            indicative based on industry averages
          </p>
        </div>
      </footer>
    </div>
  )
}

function formatSavingsShort(val: number): string {
  if (val >= 1_000_000)
    return '$' + (val / 1_000_000).toFixed(2) + 'M'
  if (val >= 1000)
    return '$' + (val / 1000).toFixed(0) + 'K'
  return '$' + Math.round(val).toLocaleString()
}
