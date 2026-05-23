export default function ChartCard({ title, children, delay = 0, className = '' }: any) {
  return (
    <div
      className={`glass-panel glass-panel-hover p-5 ${className}`}
      style={{ animationDelay: `${delay * 0.05}s` }}
    >
      {title && <h3 className="text-sm font-semibold text-passport-text mb-4">{title}</h3>}
      {children}
    </div>
  )
}
