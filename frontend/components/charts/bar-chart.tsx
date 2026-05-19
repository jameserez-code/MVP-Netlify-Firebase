'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'

interface BarChartProps {
  data: any[]
  bars: {
    key: string
    name: string
    color: string
  }[]
  xKey?: string
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  cellColors?: string[]
  className?: string
  height?: number
  layout?: 'vertical' | 'horizontal'
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

export default function GenericBarChart({
  data,
  bars,
  xKey = 'name',
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  cellColors,
  className = '',
  height = 300,
  layout = 'horizontal',
}: BarChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(48, 54, 61, 0.3)"
              horizontal={layout === 'horizontal'}
              vertical={layout === 'vertical'}
            />
          )}
          <XAxis
            dataKey={layout === 'horizontal' ? xKey : undefined}
            type={layout === 'horizontal' ? 'category' : 'number'}
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(48, 54, 61, 0.3)' }}
            tickLine={false}
          />
          <YAxis
            dataKey={layout === 'vertical' ? xKey : undefined}
            type={layout === 'horizontal' ? 'number' : 'category'}
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
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name}
              fill={bar.color}
              radius={layout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]}
            >
              {cellColors &&
                data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={cellColors[index % cellColors.length]} />
                ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
