'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PieChartProps {
  data: any[]
  dataKey: string
  nameKey: string
  colors?: string[]
  showTooltip?: boolean
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
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

const defaultColors = ['#2ea043', '#f78166', '#58a6ff', '#d2991d', '#a371f7', '#3fb950']

export default function GenericPieChart({
  data,
  dataKey,
  nameKey,
  colors = defaultColors,
  showTooltip = true,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
  className = '',
  height = 300,
}: PieChartProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          {showTooltip && (
            <Tooltip
              contentStyle={defaultTooltipStyle as any}
              itemStyle={{ color: '#c9d1d9', fontSize: '12px' }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#8b949e' }}
            />
          )}
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
