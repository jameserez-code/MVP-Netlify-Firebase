'use client'
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip } from 'recharts'

const COLORS = ['#2ea043', '#f78166', '#58a6ff', '#d2991d', '#8b949e']

export default function PieChartWrapper({ data, dataKey = 'value', nameKey = 'name', height = 250, donut = false }: any) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-passport-muted text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPie>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={donut ? 50 : 0} outerRadius={80} paddingAngle={2}>
          {data.map((_: any, index: number) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }} />
      </RechartsPie>
    </ResponsiveContainer>
  )
}
