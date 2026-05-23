'use client'
import { ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export default function BarChartWrapper({ data, dataKey, xKey = 'name', color = '#2ea043', height = 300, horizontal = false }: any) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-passport-muted text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
        {horizontal ? (
          <>
            <XAxis type="number" stroke="#484f58" fontSize={12} />
            <YAxis dataKey={xKey} type="category" stroke="#484f58" fontSize={12} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} stroke="#484f58" fontSize={12} />
            <YAxis stroke="#484f58" fontSize={12} />
          </>
        )}
        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBar>
    </ResponsiveContainer>
  )
}
