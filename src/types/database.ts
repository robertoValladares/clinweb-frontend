export type MessageRole = 'user' | 'assistant'

export type Channel = 'whatsapp' | 'instagram' | 'facebook' | 'api' | string

export interface Subscriber {
  subscriber_id: string
  full_name: string | null
  channel: string | null
  phone: string | null
  email: string | null
  cedula: string | null
  fecha_nacimiento: string | null
  last_seen_at: string
  created_at: string
}

export interface Message {
  id: string
  subscriber_id: string
  role: MessageRole
  content: string
  channel: string | null
  created_at: string
}

export interface AppointmentLog {
  id: string
  subscriber_id: string
  fecha_hora_inicio: string
  motivo: string | null
  tipo_pago: string | null
  ok: boolean
  co_paciente: string | null
  error: string | null
  created_at: string
  deposito_usd: number | null
  deposito_ok: boolean | null
  comprobante_url: string | null
  vision_notes: string | null
  estado: string | null
}

export type DateRangeKey = 'today' | '7d' | '30d' | 'month' | 'all'

export interface DateRange {
  key: DateRangeKey
  from: Date | null
  to: Date
  label: string
}

export interface DailyCount {
  day: string
  user: number
  assistant: number
  citas: number
}

export interface NamedCount {
  name: string
  value: number
}

export interface DashboardMetrics {
  botReplies: number
  patientMessages: number
  activeConversations: number
  bookedAppointments: number
  depositsOk: number
  bookingErrors: number
  newSubscribers: number
  conversionPct: number
  daily: DailyCount[]
  byChannel: NamedCount[]
  byMotivo: NamedCount[]
  byTipoPago: NamedCount[]
  recentAppointments: AppointmentLog[]
  recentDeposits: AppointmentLog[]
  recentErrors: AppointmentLog[]
  recentSubscribers: Subscriber[]
}