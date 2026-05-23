'use client'
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, Tooltip } from 'recharts'

export default function LineChartWrapper({
  data,
  dataKeys,
  xKey = 'date',
  colors = ['#2ea043', '#f78166', '#58a6ff'],
  height = 300,
}: any) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-passport-muted text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLine data={data}>
        <XAxis dataKey={xKey} stroke="#484f58" fontSize={12} />
        <YAxis stroke="#484f58" fontSize={12} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#8b949e' }}
        />
        {dataKeys.map((key: string, i: number) => (
          <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
        ))}
      </RechartsLine>
    </ResponsiveContainer>
  )
}
