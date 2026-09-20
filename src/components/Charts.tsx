import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyCount, NamedCount } from '../types/database'

export function ChartMessagesDaily({ data }: { data: DailyCount[] }) {
  if (!data.length) return <p className="empty">Sin mensajes en este rango.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,28,0.08)" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="user" name="Pacientes" stroke="#0f766e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="assistant" name="Bot" stroke="#c45c3e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ChartAppointmentsDaily({ data }: { data: DailyCount[] }) {
  if (!data.length) return <p className="empty">Sin citas en este rango.</p>
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,28,0.08)" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="citas" name="Citas" fill="#0f766e" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ChartNamedBars({ data, empty }: { data: NamedCount[]; empty: string }) {
  if (!data.length) return <p className="empty">{empty}</p>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,28,0.08)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" name="Total" fill="#14534d" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}