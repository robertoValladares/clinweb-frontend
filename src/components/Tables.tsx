import { useMemo, useState } from 'react'
import type { AppointmentLog, Subscriber } from '../types/database'
import { formatMoney, formatPanamaDateTime, shortText } from '../lib/format'

function matches(hay: Array<string | null | undefined>, q: string): boolean {
  return hay.join(' ').toLowerCase().includes(q)
}

export function TableAppointments({ rows }: { rows: AppointmentLog[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      matches([r.subscriber_id, r.motivo, r.tipo_pago, r.co_paciente, r.fecha_hora_inicio], s),
    )
  }, [rows, q])

  return (
    <section className="panel">
      <h2>Últimas citas agendadas</h2>
      <input className="search" placeholder="Buscar id / motivo…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!filtered.length ? (
        <p className="empty">Sin citas en este rango.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Log</th>
                <th>Subscriber</th>
                <th>Motivo</th>
                <th>Pago</th>
                <th>Cupo</th>
                <th>Paciente</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatPanamaDateTime(r.created_at)}</td>
                  <td className="mono">{r.subscriber_id}</td>
                  <td>{r.motivo || '—'}</td>
                  <td>{r.tipo_pago || '—'}</td>
                  <td>{r.fecha_hora_inicio}</td>
                  <td className="mono">{r.co_paciente || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function TableDeposits({ rows }: { rows: AppointmentLog[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      matches([r.subscriber_id, r.vision_notes, String(r.deposito_usd ?? '')], s),
    )
  }, [rows, q])

  return (
    <section className="panel">
      <h2>Últimos depósitos validados</h2>
      <input className="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!filtered.length ? (
        <p className="empty">Sin depósitos en este rango.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Subscriber</th>
                <th>Monto</th>
                <th>Comprobante</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatPanamaDateTime(r.created_at)}</td>
                  <td className="mono">{r.subscriber_id}</td>
                  <td>{formatMoney(r.deposito_usd)}</td>
                  <td>
                    {r.comprobante_url ? (
                      <a href={r.comprobante_url} target="_blank" rel="noreferrer">
                        ver
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{shortText(r.vision_notes, 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function TableErrors({ rows }: { rows: AppointmentLog[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => matches([r.subscriber_id, r.motivo, r.error], s))
  }, [rows, q])

  return (
    <section className="panel">
      <h2>Últimos errores al agendar</h2>
      <input className="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!filtered.length ? (
        <p className="empty">Sin errores en este rango.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Subscriber</th>
                <th>Motivo</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatPanamaDateTime(r.created_at)}</td>
                  <td className="mono">{r.subscriber_id}</td>
                  <td>{r.motivo || '—'}</td>
                  <td>{shortText(r.error, 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function TableSubscribers({ rows }: { rows: Subscriber[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) =>
      matches([r.subscriber_id, r.full_name, r.channel, r.phone, r.email], s),
    )
  }, [rows, q])

  return (
    <section className="panel">
      <h2>Contactos recientes</h2>
      <input className="search" placeholder="Buscar nombre / id…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!filtered.length ? (
        <p className="empty">Sin contactos.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Canal</th>
                <th>Teléfono</th>
                <th>Visto</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.subscriber_id}>
                  <td>{r.full_name || '—'}</td>
                  <td>
                    <span className="chip">{r.channel || '—'}</span>
                  </td>
                  <td>{r.phone || '—'}</td>
                  <td>{formatPanamaDateTime(r.last_seen_at)}</td>
                  <td className="mono">{r.subscriber_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}