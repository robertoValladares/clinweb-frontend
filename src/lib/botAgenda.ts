import { getSupabase } from './supabase'
import type { BotAgendaRow, BotBookingCheck } from '../types/database'

const PAGE = 1000

export async function loadBotAgenda(): Promise<BotAgendaRow[]> {
  const sb = getSupabase()
  const all: BotAgendaRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('bot_agenda')
      .select('*')
      .order('fecha_hora_inicio', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const chunk = (data ?? []) as BotAgendaRow[]
    all.push(...chunk)
    if (chunk.length < PAGE) break
  }
  return all
}

export async function loadBotBookingChecks(bookingId: string): Promise<BotBookingCheck[]> {
  const { data, error } = await getSupabase()
    .from('bot_booking_checks')
    .select('id, booking_id, checked_at, status, detail')
    .eq('booking_id', bookingId)
    .order('checked_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as BotBookingCheck[]
}

export function patientName(r: BotAgendaRow): string {
  return r.paciente_nombre || r.cliniweb_nombre || r.contacto_nombre || 'Sin nombre'
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function botAgendaToCsv(rows: BotAgendaRow[], formatDate: (iso: string | null) => string): string {
  const header = [
    'Cita (Panamá)',
    'Paciente',
    'Cédula',
    'Celular',
    'Email',
    'Motivo',
    'Pago',
    'Abono USD',
    'Agendada por el bot',
    'Canal',
    'ID paciente CliniWeb',
    'Estado en CliniWeb',
    'Detalle',
    'Última verificación',
    'Desapareció desde',
    'Comprobante',
    'ID registro',
  ]
  const lines = rows.map((r) =>
    [
      formatDate(r.fecha_hora_inicio),
      patientName(r),
      r.paciente_cedula,
      r.paciente_celular,
      r.paciente_email,
      r.motivo,
      r.tipo_pago,
      r.deposito_usd,
      formatDate(r.created_at),
      r.channel,
      r.co_paciente,
      r.verificacion ?? 'sin verificar',
      r.verificacion_detalle,
      formatDate(r.last_checked_at),
      formatDate(r.first_missing_at),
      r.comprobante_url,
      r.id,
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}
