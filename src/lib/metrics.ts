import { panamaDayKey } from './format'
import { isBookedAppointment, isBookingError, isDepositRow, takeRecentAppointments, takeRecentDeposits, takeRecentErrors } from './classifiers'
import { getSupabase } from './supabase'
import type {
  AppointmentLog,
  DailyCount,
  DashboardMetrics,
  DateRange,
  Message,
  NamedCount,
  Subscriber,
} from '../types/database'

const PAGE = 1000

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const to = from + PAGE - 1
    const { data, error } = await fetchPage(from, to)
    if (error) throw new Error(error.message)
    const chunk = data ?? []
    all.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }
  return all
}

function applyCreatedAtFilter<Q extends { gte: (c: string, v: string) => Q; lte: (c: string, v: string) => Q }>(
  query: Q,
  range: DateRange,
): Q {
  let q = query
  if (range.from) q = q.gte('created_at', range.from.toISOString())
  q = q.lte('created_at', range.to.toISOString())
  return q
}

function topCounts(map: Map<string, number>, limit = 8): NamedCount[] {
  return [...map.entries()]
    .map(([name, value]) => ({ name: name || 'sin dato', value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function buildDaily(messages: Message[], appointments: AppointmentLog[]): DailyCount[] {
  const map = new Map<string, DailyCount>()
  const ensure = (day: string) => {
    let row = map.get(day)
    if (!row) {
      row = { day, user: 0, assistant: 0, citas: 0 }
      map.set(day, row)
    }
    return row
  }
  for (const m of messages) {
    const day = panamaDayKey(m.created_at)
    const row = ensure(day)
    if (m.role === 'user') row.user += 1
    else if (m.role === 'assistant') row.assistant += 1
  }
  for (const a of appointments) {
    if (!isBookedAppointment(a)) continue
    ensure(panamaDayKey(a.created_at)).citas += 1
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export async function loadDashboardMetrics(range: DateRange): Promise<DashboardMetrics> {
  const sb = getSupabase()

  const messages = await fetchAllPages<Message>((from, to) => {
    let q = sb
      .from('messages')
      .select('id, subscriber_id, role, content, channel, created_at')
      .order('created_at', { ascending: true })
      .range(from, to)
    q = applyCreatedAtFilter(q, range)
    return q
  })

  const appointments = await fetchAllPages<AppointmentLog>((from, to) => {
    let q = sb
      .from('appointments_log')
      .select(
        'id, subscriber_id, fecha_hora_inicio, motivo, tipo_pago, ok, co_paciente, error, created_at, deposito_usd, deposito_ok, comprobante_url, vision_notes, estado',
      )
      .order('created_at', { ascending: true })
      .range(from, to)
    q = applyCreatedAtFilter(q, range)
    return q
  })

  const subscribers = await fetchAllPages<Subscriber>((from, to) => {
    let q = sb
      .from('subscribers')
      .select(
        'subscriber_id, full_name, channel, phone, email, cedula, fecha_nacimiento, last_seen_at, created_at',
      )
      .order('created_at', { ascending: false })
      .range(from, to)
    if (range.from) {
      q = q.gte('created_at', range.from.toISOString())
    }
    q = q.lte('created_at', range.to.toISOString())
    return q
  })

  // For "recent contacts" when range is narrow, also pull latest overall if empty
  let recentSubscribers = subscribers.slice(0, 20)
  if (recentSubscribers.length === 0) {
    const { data, error } = await sb
      .from('subscribers')
      .select(
        'subscriber_id, full_name, channel, phone, email, cedula, fecha_nacimiento, last_seen_at, created_at',
      )
      .order('last_seen_at', { ascending: false })
      .limit(20)
    if (error) throw new Error(error.message)
    recentSubscribers = data ?? []
  }

  const botReplies = messages.filter((m) => m.role === 'assistant').length
  const patientMessages = messages.filter((m) => m.role === 'user').length
  const activeConversations = new Set(messages.map((m) => m.subscriber_id)).size

  const booked = appointments.filter(isBookedAppointment)
  const deposits = appointments.filter(
    (r) => isDepositRow(r) && (r.deposito_ok === true || r.estado === 'deposito_ok'),
  )
  const errors = appointments.filter(isBookingError)

  const depositSubs = new Set(deposits.map((d) => d.subscriber_id))
  const bookedSubs = new Set(booked.map((b) => b.subscriber_id))
  let converted = 0
  for (const id of depositSubs) {
    if (bookedSubs.has(id)) converted += 1
  }
  const conversionPct =
    depositSubs.size === 0 ? 0 : Math.round((converted / depositSubs.size) * 1000) / 10

  const channelMap = new Map<string, number>()
  for (const m of messages) {
    const ch = m.channel || 'sin canal'
    channelMap.set(ch, (channelMap.get(ch) ?? 0) + 1)
  }

  const motivoMap = new Map<string, number>()
  const pagoMap = new Map<string, number>()
  for (const a of booked) {
    motivoMap.set(a.motivo || 'sin motivo', (motivoMap.get(a.motivo || 'sin motivo') ?? 0) + 1)
    pagoMap.set(a.tipo_pago || 'sin tipo', (pagoMap.get(a.tipo_pago || 'sin tipo') ?? 0) + 1)
  }

  return {
    botReplies,
    patientMessages,
    activeConversations,
    bookedAppointments: booked.length,
    depositsOk: deposits.length,
    bookingErrors: errors.length,
    newSubscribers: subscribers.length,
    conversionPct,
    daily: buildDaily(messages, appointments),
    byChannel: topCounts(channelMap, 6),
    byMotivo: topCounts(motivoMap, 8),
    byTipoPago: topCounts(pagoMap, 6),
    recentAppointments: takeRecentAppointments(appointments),
    recentDeposits: takeRecentDeposits(appointments),
    recentErrors: takeRecentErrors(appointments),
    recentSubscribers,
  }
}