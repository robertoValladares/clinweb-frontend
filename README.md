# clinweb-frontend

Dashboard SPA liviano para **CliniWeb / Derma Health Center**. Lee solo Supabase (sin Nest, sin ManyChat, sin CliniWeb API).

## Qué muestra

- Respuestas del bot (`messages.role = assistant`)
- Mensajes de pacientes (`messages.role = user`)
- Conversaciones activas (distinct `subscriber_id`)
- Citas agendadas (`appointments_log` con `ok=true` / `estado=cita_creada`)
- Depósitos validados (`estado=deposito_ok` / `motivo=comprobante_anticipo`)
- Errores al agendar
- Nuevos contactos y tablas recientes
- Gráficos por día, canal, motivo y tipo de pago

**Importante:** un depósito no es una cita. Las filas con `fecha_hora_inicio = pendiente-deposito` se cuentan aparte.

## Setup

```bash
cp .env.example .env.local
# Edita VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Build estático:

```bash
npm run build
# salida en dist/
npm run preview
```

## Variables

En el backend: `SUPABASE_URL` y `SUPABASE_ANON_KEY`.  
En este frontend Vite deben llamarse así:

| Backend | Frontend (Vite) |
|---|---|
| `SUPABASE_URL` | `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `VITE_SUPABASE_ANON_KEY` |

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key (nunca service role) |
| `VITE_DASH_PASSWORD` | Opcional: gate simple en el navegador (solo disuasión) |

**No copies el `.env` completo del backend.** Vite solo lee variables `VITE_*`, y el service role / OpenAI / ManyChat no deben ir al navegador.

## Tablas leídas

- `subscribers`
- `messages`
- `appointments_log`

Si RLS está activo y el anon no puede leer, crea políticas de SELECT o usa las vistas `public` del backend.

## Alcance

- Solo lectura (SELECT)
- SPA Vite + React + TypeScript
- Fechas mostradas en `America/Panama`
