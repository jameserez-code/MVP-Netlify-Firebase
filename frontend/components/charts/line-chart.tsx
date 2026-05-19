'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'

interface LineChartProps {
  data: any[]
  lines: {
    key: string
    name: string
    color: string
    strokeDasharray?: string
  }[]
  xKey?: string
  yAxisLabel?: string
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  referenceLines?: {
    y: number
    color: string
    label?: string
    strokeDasharray?: string
  }[]
  className?: string
  height?: number
}

const defaultTooltipStyle = {
  backgroundColor: 'rgba(22, 27, 34, 0.9)',
  border: '1px solid rgba(48, 54, 61, 0.8)',
  borderRadius: '6px',
  backdropFilter: 'blur(12px)',
  color: '#c9d1d9',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
}

export default function GenericLineChart({
  data,
  lines,
  xKey = 'date',
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  referenceLines = [],
  className = '',
  height = 300,
}: LineChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(48, 54, 61, 0.3)"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(48, 54, 61, 0.3)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={defaultTooltipStyle as any}
              itemStyle={{ color: '#c9d1d9', fontSize: '12px' }}
              labelStyle={{ color: '#8b949e', fontSize: '11px', marginBottom: '4px' }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#8b949e' }}
            />
          )}
          {referenceLines.map((ref, i) => (
            <ReferenceLine
              key={i}
              y={ref.y}
              stroke={ref.color}
              strokeDasharray={ref.strokeDasharray || '5 5'}
              label={
                ref.label
                  ? { value: ref.label, fill: ref.color, fontSize: 11, position: 'right' }
                  : undefined
              }
            />
          ))}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.strokeDasharray}
              dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: line.color, strokeWidth: 2, stroke: '#0d1117' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
