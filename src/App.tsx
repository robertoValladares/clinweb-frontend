import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BotAgenda } from './components/BotAgenda'
import { ChartAppointmentsDaily, ChartMessagesDaily, ChartNamedBars } from './components/Charts'
import { KpiCard } from './components/KpiCard'
import { TableAppointments, TableDeposits, TableErrors, TableSubscribers } from './components/Tables'
import { RANGE_OPTIONS, resolveDateRange } from './lib/dateRange'
import { loadDashboardMetrics } from './lib/metrics'
import { getConfigError, hasSupabaseConfig } from './lib/supabase'
import type { DashboardMetrics, DateRangeKey } from './types/database'

const PASSWORD = import.meta.env.VITE_DASH_PASSWORD?.trim()
const GATE_KEY = 'clinweb-dash-unlocked'

function PasswordGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => {
    if (!PASSWORD) return true
    return sessionStorage.getItem(GATE_KEY) === '1'
  })
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (ok) return children

  return (
    <div className="gate">
      <form
        className="gate-card"
        onSubmit={(e) => {
          e.preventDefault()
          if (value === PASSWORD) {
            sessionStorage.setItem(GATE_KEY, '1')
            setOk(true)
          } else {
            setError('Contraseña incorrecta')
          }
        }}
      >
        <h1>CliniWeb Ops</h1>
        <p>Acceso interno al dashboard de métricas.</p>
        <input
          type="password"
          placeholder="Contraseña"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        {error ? <p className="banner error">{error}</p> : null}
        <button className="gate-btn" type="submit">
          Entrar
        </button>
      </form>
    </div>
  )
}

type Tab = 'metricas' | 'agenda'

export default function App() {
  const [tab, setTab] = useState<Tab>('metricas')

  return (
    <PasswordGate>
      <div className="app-shell">
        <nav className="tabs">
          <button
            type="button"
            className={`tab-btn${tab === 'metricas' ? ' active' : ''}`}
            onClick={() => setTab('metricas')}
          >
            Métricas
          </button>
          <button
            type="button"
            className={`tab-btn${tab === 'agenda' ? ' active' : ''}`}
            onClick={() => setTab('agenda')}
          >
            Agenda del bot
          </button>
        </nav>
        {tab === 'metricas' ? (
          <MetricsView />
        ) : (
          <>
            <header className="hero">
              <div>
                <h1>Agenda del bot</h1>
                <p>Citas que el bot agendó en la agenda de la Dra. Yariela y si siguen en CliniWeb.</p>
              </div>
            </header>
            {!hasSupabaseConfig() ? <div className="banner error">{getConfigError()}</div> : <BotAgenda />}
          </>
        )}
      </div>
    </PasswordGate>
  )
}

function MetricsView() {
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('7d')
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const configErr = getConfigError()
    if (configErr) {
      setError(configErr)
      setMetrics(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const range = resolveDateRange(rangeKey)
      const data = await loadDashboardMetrics(range)
      setMetrics(data)
    } catch (e) {
      setMetrics(null)
      setError(e instanceof Error ? e.message : 'No se pudo cargar Supabase')
    } finally {
      setLoading(false)
    }
  }, [rangeKey])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <header className="hero">
        <div>
          <h1>CliniWeb Analytics</h1>
          <p>Métricas en vivo desde Supabase: respuestas del bot, citas, depósitos y contactos. Sin backend propio.</p>
        </div>
        <div className="toolbar">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`range-btn${rangeKey === opt.key ? ' active' : ''}`}
              onClick={() => setRangeKey(opt.key)}
            >
              {opt.label}
            </button>
          ))}
          <button type="button" className="refresh-btn" onClick={() => void load()} disabled={loading}>
            {loading ? 'Cargando…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error ? <div className="banner error">{error}</div> : null}
      {!hasSupabaseConfig() ? (
        <div className="banner info">
          Copia <code>.env.example</code> a <code>.env.local</code> con tu URL y anon key de Supabase, luego reinicia{' '}
          <code>npm run dev</code>.
        </div>
      ) : null}

      {loading && !metrics ? (
        <div className="kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : null}

      {metrics ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="Respuestas del bot" value={metrics.botReplies} />
            <KpiCard label="Mensajes de pacientes" value={metrics.patientMessages} />
            <KpiCard label="Conversaciones activas" value={metrics.activeConversations} />
            <KpiCard label="Citas agendadas" value={metrics.bookedAppointments} />
            <KpiCard label="Depósitos validados" value={metrics.depositsOk} />
            <KpiCard label="Errores al agendar" value={metrics.bookingErrors} />
            <KpiCard label="Nuevos contactos" value={metrics.newSubscribers} />
            <KpiCard
              label="Conversión depósito→cita"
              value={`${metrics.conversionPct}%`}
              hint="Suscriptores con depósito que también tienen cita"
            />
          </section>

          <section className="charts">
            <div className="panel">
              <h2>Mensajes por día</h2>
              <ChartMessagesDaily data={metrics.daily} />
            </div>
            <div className="panel">
              <h2>Citas por día</h2>
              <ChartAppointmentsDaily data={metrics.daily} />
            </div>
            <div className="panel">
              <h2>Volumen por canal</h2>
              <ChartNamedBars data={metrics.byChannel} empty="Sin canales en este rango." />
            </div>
            <div className="panel">
              <h2>Citas por motivo</h2>
              <ChartNamedBars data={metrics.byMotivo} empty="Sin motivos en este rango." />
            </div>
            <div className="panel">
              <h2>Citas por tipo de pago</h2>
              <ChartNamedBars data={metrics.byTipoPago} empty="Sin tipos de pago en este rango." />
            </div>
          </section>

          <section className="tables">
            <TableAppointments rows={metrics.recentAppointments} />
            <TableDeposits rows={metrics.recentDeposits} />
            <TableErrors rows={metrics.recentErrors} />
            <TableSubscribers rows={metrics.recentSubscribers} />
          </section>
        </>
      ) : null}
    </>
  )
}
