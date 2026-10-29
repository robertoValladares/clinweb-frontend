import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { KpiCard } from './KpiCard'
import { botAgendaToCsv, loadBotAgenda, loadBotBookingChecks, patientName } from '../lib/botAgenda'
import { formatMoney, formatPanamaDateTime, panamaDayKey } from '../lib/format'
import type { BotAgendaRow, BotBookingCheck, BotBookingVerification } from '../types/database'

type Scope = 'proximas' | 'pasadas' | 'todas'

const TZ = 'America/Panama'

const STATUS_LABEL: Record<BotBookingVerification, string> = {
  presente: 'En CliniWeb',
  movida: 'Movida de hora',
  no_encontrada: 'Ya no está en CliniWeb',
  error: 'No se pudo verificar',
}

const STATUS_CLASS: Record<BotBookingVerification, string> = {
  presente: 'ok',
  movida: 'warn',
  no_encontrada: 'danger',
  error: 'muted',
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-PA', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatDayTitle(dayKey: string): string {
  const s = new Intl.DateTimeFormat('es-PA', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dayKey}T12:00:00-05:00`))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function StatusBadge({ row }: { row: BotAgendaRow }) {
  if (!row.verificacion) {
    return <span className="status-badge muted">Sin verificar</span>
  }
  return (
    <span className={`status-badge ${STATUS_CLASS[row.verificacion]}`} title={row.verificacion_detalle ?? ''}>
      {STATUS_LABEL[row.verificacion]}
    </span>
  )
}

function CheckHistory({ row }: { row: BotAgendaRow }) {
  const [checks, setChecks] = useState<BotBookingCheck[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadBotBookingChecks(row.id)
      .then((c) => alive && setChecks(c))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Error'))
    return () => {
      alive = false
    }
  }, [row.id])

  return (
    <div className="booking-detail">
      <div className="booking-facts">
        <span>
          <strong>Registrada por el bot:</strong> {formatPanamaDateTime(row.created_at)}
          {row.source !== 'bot' ? ' (importada del historial)' : ''}
        </span>
        <span>
          <strong>Email:</strong> {row.paciente_email || '—'}
        </span>
        <span>
          <strong>Canal:</strong> {row.channel || '—'}
        </span>
        <span>
          <strong>ID paciente CliniWeb:</strong> <span className="mono">{row.co_paciente || '—'}</span>
        </span>
        {row.cliniweb_nombre ? (
          <span>
            <strong>Nombre en CliniWeb:</strong> {row.cliniweb_nombre}
          </span>
        ) : null}
        {row.verificacion === 'movida' && row.cliniweb_inicio ? (
          <span>
            <strong>Hora actual en CliniWeb:</strong> {formatPanamaDateTime(row.cliniweb_inicio)}
          </span>
        ) : null}
        <span>
          <strong>Última verificación:</strong> {formatPanamaDateTime(row.last_checked_at)}
        </span>
        <span>
          <strong>Registro:</strong> <span className="mono">{row.id}</span>
        </span>
      </div>
      <h3>Historial de verificaciones</h3>
      {error ? <p className="banner error">{error}</p> : null}
      {!checks && !error ? <p className="empty">Cargando…</p> : null}
      {checks && !checks.length ? <p className="empty">Todavía no se ha verificado contra CliniWeb.</p> : null}
      {checks && checks.length ? (
        <ul className="check-list">
          {checks.map((c) => (
            <li key={c.id}>
              <span className={`status-badge ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>{' '}
              {formatPanamaDateTime(c.checked_at)} — {c.detail || ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function BotAgenda() {
  const [rows, setRows] = useState<BotAgendaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>('proximas')
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState(() => Date.now())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await loadBotAgenda())
      setLoadedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la agenda del bot')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const now = loadedAt
  const todayKey = panamaDayKey(new Date(loadedAt).toISOString())
  const isUpcoming = useCallback((r: BotAgendaRow) => panamaDayKey(r.fecha_hora_inicio) >= todayKey, [todayKey])

  const upcoming = rows.filter(isUpcoming)
  const missingUpcoming = upcoming.filter((r) => r.verificacion === 'no_encontrada')
  const movedUpcoming = upcoming.filter((r) => r.verificacion === 'movida')
  const missingAll = rows.filter((r) => r.verificacion === 'no_encontrada')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (scope === 'proximas' && !isUpcoming(r)) return false
      if (scope === 'pasadas' && isUpcoming(r)) return false
      if (onlyAlerts && r.verificacion !== 'no_encontrada' && r.verificacion !== 'movida') return false
      if (!s) return true
      return [patientName(r), r.paciente_cedula, r.paciente_celular, r.paciente_email, r.motivo, r.co_paciente]
        .join(' ')
        .toLowerCase()
        .includes(s)
    })
  }, [rows, scope, onlyAlerts, q, isUpcoming])

  const groups = useMemo(() => {
    const map = new Map<string, BotAgendaRow[]>()
    for (const r of filtered) {
      const key = panamaDayKey(r.fecha_hora_inicio)
      map.set(key, [...(map.get(key) ?? []), r])
    }
    const keys = [...map.keys()].sort()
    if (scope === 'pasadas') keys.reverse()
    return keys.map((k) => ({ day: k, rows: map.get(k)! }))
  }, [filtered, scope])

  const exportCsv = () => {
    const csv = botAgendaToCsv(filtered, (iso) => (iso ? formatPanamaDateTime(iso) : ''))
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `citas-del-bot-${todayKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="banner info">
        Registro permanente de las citas que agendó el bot en CliniWeb. No se puede editar ni borrar (ni desde el
        dashboard ni desde la base de datos). Cada hora el sistema revisa la agenda de la doctora y marca las citas que
        desaparecieron o cambiaron de hora.
      </div>

      {missingUpcoming.length ? (
        <div className="banner error">
          {missingUpcoming.length === 1
            ? '1 cita próxima agendada por el bot ya no aparece en la agenda de CliniWeb.'
            : `${missingUpcoming.length} citas próximas agendadas por el bot ya no aparecen en la agenda de CliniWeb.`}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setScope('proximas')
              setOnlyAlerts(true)
            }}
          >
            Ver cuáles
          </button>
        </div>
      ) : null}

      {error ? <div className="banner error">{error}</div> : null}

      <section className="kpi-grid">
        <KpiCard label="Citas agendadas por el bot" value={rows.length} hint="Total histórico registrado" />
        <KpiCard label="Próximas (hoy en adelante)" value={upcoming.length} />
        <KpiCard
          label="Próximas que ya no están"
          value={missingUpcoming.length}
          hint={
            missingAll.length
              ? `${missingAll.length} en total desde que se verifica`
              : 'Borradas o canceladas en CliniWeb'
          }
        />
        <KpiCard label="Próximas movidas de hora" value={movedUpcoming.length} />
      </section>

      <section className="panel">
        <div className="agenda-toolbar">
          <div className="toolbar">
            {(
              [
                ['proximas', 'Próximas'],
                ['pasadas', 'Pasadas'],
                ['todas', 'Todas'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`range-btn${scope === key ? ' active' : ''}`}
                onClick={() => setScope(key)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`range-btn${onlyAlerts ? ' active alert' : ''}`}
              onClick={() => setOnlyAlerts((v) => !v)}
            >
              Solo alertas
            </button>
          </div>
          <div className="toolbar">
            <input
              className="search"
              placeholder="Buscar paciente, cédula, celular…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="button" className="range-btn" onClick={exportCsv} disabled={!filtered.length}>
              Descargar CSV
            </button>
            <button type="button" className="refresh-btn" onClick={() => void load()} disabled={loading}>
              {loading ? 'Cargando…' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading && !rows.length ? <div className="skeleton" /> : null}
        {!loading && !groups.length ? <p className="empty">No hay citas del bot con estos filtros.</p> : null}

        {groups.map((g) => (
          <div key={g.day} className="agenda-day">
            <h2>
              {formatDayTitle(g.day)} <span className="chip">{g.rows.length}</span>
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Cédula</th>
                    <th>Celular</th>
                    <th>Motivo</th>
                    <th>Abono</th>
                    <th>Agendada</th>
                    <th>Estado en CliniWeb</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => {
                    const past = new Date(r.fecha_hora_inicio).getTime() < now
                    return (
                      <Fragment key={r.id}>
                        <tr className={r.verificacion === 'no_encontrada' ? 'row-alert' : past ? 'row-past' : ''}>
                          <td className="nowrap">{formatTime(r.fecha_hora_inicio)}</td>
                          <td>
                            {patientName(r)}
                            {r.source !== 'bot' ? (
                              <span
                                className="chip"
                                title="Cita anterior a este registro: nombre, cédula y celular vienen del perfil del contacto, no de lo que escribió al agendar"
                              >
                                historial
                              </span>
                            ) : null}
                          </td>
                          <td className="mono nowrap">{r.paciente_cedula || '—'}</td>
                          <td className="nowrap">{r.paciente_celular || '—'}</td>
                          <td>
                            {r.motivo || '—'}
                            {r.tipo_pago && r.tipo_pago !== 'particular' ? (
                              <span className="chip">{r.tipo_pago}</span>
                            ) : null}
                          </td>
                          <td className="nowrap">
                            {r.comprobante_url ? (
                              <a href={r.comprobante_url} target="_blank" rel="noreferrer">
                                {formatMoney(r.deposito_usd)}
                              </a>
                            ) : (
                              formatMoney(r.deposito_usd)
                            )}
                          </td>
                          <td className="nowrap">{formatPanamaDateTime(r.created_at)}</td>
                          <td>
                            <StatusBadge row={r} />
                            {r.first_missing_at && r.verificacion === 'no_encontrada' ? (
                              <div className="hint">desde {formatPanamaDateTime(r.first_missing_at)}</div>
                            ) : null}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                            >
                              {openId === r.id ? 'Cerrar' : 'Detalle'}
                            </button>
                          </td>
                        </tr>
                        {openId === r.id ? (
                          <tr>
                            <td colSpan={9}>
                              <CheckHistory row={r} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
