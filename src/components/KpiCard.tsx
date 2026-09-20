type Props = {
  label: string
  value: string | number
  hint?: string
}

export function KpiCard({ label, value, hint }: Props) {
  return (
    <article className="kpi-card">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
      {hint ? <p className="hint">{hint}</p> : null}
    </article>
  )
}