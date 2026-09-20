import type { AppointmentLog } from '../types/database'

export function isDepositRow(row: {
  estado?: string | null
  motivo?: string | null
  fecha_hora_inicio?: string | null
}): boolean {
  return (
    row.estado === 'deposito_ok' ||
    row.motivo === 'comprobante_anticipo' ||
    row.fecha_hora_inicio === 'pendiente-deposito'
  )
}

export function isBookedAppointment(row: {
  ok?: boolean | null
  estado?: string | null
  motivo?: string | null
  fecha_hora_inicio?: string | null
}): boolean {
  if (isDepositRow(row)) return false
  return row.ok === true || row.estado === 'cita_creada'
}

export function isBookingError(row: {
  ok?: boolean | null
  estado?: string | null
  motivo?: string | null
  fecha_hora_inicio?: string | null
}): boolean {
  if (isDepositRow(row)) return false
  return row.estado === 'error_agendar' || row.ok === false
}

export function sortByCreatedDesc<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function takeRecentAppointments(rows: AppointmentLog[], n = 20): AppointmentLog[] {
  return sortByCreatedDesc(rows.filter(isBookedAppointment)).slice(0, n)
}

export function takeRecentDeposits(rows: AppointmentLog[], n = 20): AppointmentLog[] {
  return sortByCreatedDesc(
    rows.filter((r) => isDepositRow(r) && (r.deposito_ok === true || r.estado === 'deposito_ok')),
  ).slice(0, n)
}

export function takeRecentErrors(rows: AppointmentLog[], n = 20): AppointmentLog[] {
  return sortByCreatedDesc(rows.filter(isBookingError)).slice(0, n)
}