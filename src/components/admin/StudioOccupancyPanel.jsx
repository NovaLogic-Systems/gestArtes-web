/**
 * @file src/components/admin/StudioOccupancyPanel.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import studioOccupancyService from '../../services/studioOccupancyService'
import KPICard from '../ui/KPICard'
import StudioOccupancyCard from './StudioOccupancyCard'
import { localizeApiError } from '../../utils/apiErrors'

const MANUAL_STATUSES = ['available', 'occupied', 'blocked', 'maintenance', 'unavailable']
const BLOCK_TYPE_OPTIONS = ['maintenance', 'unavailable', 'blocked']

const STATUS_LABELS_PT = {
  available: 'Livre',
  occupied: 'Em utilização',
  blocked: 'Bloqueado',
  maintenance: 'Manutenção',
  unavailable: 'Indisponível',
}

const BLOCK_TYPE_LABELS_PT = {
  maintenance: 'Manutenção',
  unavailable: 'Indisponível',
  blocked: 'Bloqueado',
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrNull(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSessionOwner(session) {
  return session?.currentUser?.fullName || 'Professor não definido'
}

export default function StudioOccupancyPanel({ initialStudioId = '' }) {
  const [data, setData] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedStudioId, setSelectedStudioId] = useState('')
  const [actionMode, setActionMode] = useState('status')
  const [manualStatus, setManualStatus] = useState('available')
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(new Date()))
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [blockType, setBlockType] = useState('maintenance')
  const [saving, setSaving] = useState(false)
  const [formNotice, setFormNotice] = useState('')
  const [formError, setFormError] = useState('')

  // Memoize fetchData to ensure interval cleanup works correctly
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const now = new Date()
      const forecastEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const [res, forecastRes] = await Promise.all([
        studioOccupancyService.getRealTime(now.toISOString()),
        studioOccupancyService.getForecast(now.toISOString(), forecastEnd.toISOString()),
      ])
      setData(res)
      setForecast(forecastRes)
      setError(null)
    } catch {
      setError('Erro ao carregar ocupação.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const interval = setInterval(() => { void fetchData() }, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (!Array.isArray(data?.studios) || data.studios.length === 0) {
      return
    }

    const availableIds = new Set(data.studios.map((studio) => String(studio.studioId)))
    const preferred = String(initialStudioId || '')

    if (preferred && availableIds.has(preferred)) {
      setSelectedStudioId(preferred)
      return
    }

    if (selectedStudioId && availableIds.has(String(selectedStudioId))) {
      return
    }

    setSelectedStudioId(String(data.studios[0].studioId))
  }, [data, initialStudioId, selectedStudioId])

  const handleCardBlock = (studio) => {
    setSelectedStudioId(String(studio.studioId))
    setActionMode('block')
    setReason(studio.status === 'maintenance' ? 'Manutenção do estúdio' : '')
    setFormError('')
    setFormNotice('')
  }

  const handleCardStatus = (studio) => {
    setSelectedStudioId(String(studio.studioId))
    setActionMode('status')
    setFormError('')
    setFormNotice('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const studioId = Number(selectedStudioId)
    if (!Number.isInteger(studioId) || studioId <= 0) {
      setFormError('Seleciona um estúdio válido.')
      return
    }

    const normalizedStart = toIsoOrNull(startsAt)
    const normalizedEnd = toIsoOrNull(endsAt)

    if (actionMode === 'block') {
      if (!normalizedStart || !normalizedEnd) {
        setFormError('Para bloquear, indica início e fim válidos.')
        return
      }

      if (new Date(normalizedEnd) <= new Date(normalizedStart)) {
        setFormError('O fim do bloqueio deve ser posterior ao início.')
        return
      }
    }

    if (!MANUAL_STATUSES.includes(manualStatus)) {
      setFormError('Estado manual inválido.')
      return
    }

    setSaving(true)
    setFormError('')
    setFormNotice('')

    try {
      if (actionMode === 'block') {
        await studioOccupancyService.blockStudio({
          studioId,
          startsAt: normalizedStart,
          endsAt: normalizedEnd,
          reason: reason || undefined,
          blockType: blockType || 'maintenance',
        })
        setFormNotice('Bloqueio aplicado com sucesso.')
      } else {
        await studioOccupancyService.updateStudioStatus(studioId, {
          status: manualStatus,
          reason: reason || undefined,
          startsAt: normalizedStart || undefined,
          endsAt: normalizedEnd || undefined,
        })
        setFormNotice('Estado manual atualizado com sucesso.')
      }

      await fetchData()
    } catch (requestError) {
      setFormError(localizeApiError(requestError, 'Não foi possível guardar a atualização.'))
    } finally {
      setSaving(false)
    }
  }

  const sessionRows = useMemo(() => {
    const referenceDate = new Date(data?.generatedAt || Date.now())
    const activeRows = Array.isArray(data?.studios)
      ? data.studios.flatMap((studio) => (
          Array.isArray(studio.activeSessions)
            ? studio.activeSessions.map((session) => ({
                ...session,
                studioId: studio.studioId,
                studioName: studio.studioName,
                timing: 'active',
              }))
            : []
        ))
      : []

    const forecastRows = Array.isArray(forecast?.studios)
      ? forecast.studios.flatMap((studio) => (
          Array.isArray(studio.upcomingSessions)
            ? studio.upcomingSessions.map((session) => {
                const start = new Date(session.startTime)
                const end = new Date(session.endTime)
                const isActive = start <= referenceDate && end > referenceDate

                return {
                  ...session,
                  studioId: studio.studioId,
                  studioName: studio.studioName,
                  timing: isActive ? 'active' : 'upcoming',
                }
              })
            : []
        ))
      : []

    const byKey = new Map()
    ;[...activeRows, ...forecastRows].forEach((session) => {
      const key = `${session.sessionId}-${session.studioId}-${session.timing}`
      if (!byKey.has(key)) {
        byKey.set(key, session)
      }
    })

    return [...byKey.values()]
      .sort((left, right) => {
        if (left.timing !== right.timing) {
          return left.timing === 'active' ? -1 : 1
        }

        return new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
      })
  }, [data?.generatedAt, data?.studios, forecast?.studios])

  if (loading && !data) return <div className="occupancy-state">A carregar ocupação...</div>
  if (error) return <div className="occupancy-state occupancy-state-error">{error}</div>
  if (!data) return null

  const summary = data.summary || {}
  const forecastSummary = forecast?.summary || {}
  const occupancyRate = Number(summary.occupancyRate || 0)
  const utilizationRate = Number(forecastSummary.averageUtilizationRate || 0)

  return (
    <div className="occupancy-panel">
      {data.alerts && data.alerts.length > 0 && (
        <div className="occupancy-alert">
          <h4>Alerta de Sobreposição</h4>
          <ul>
            {data.alerts.map((alert, idx) => (
              <li key={idx}>Conflito de horários no {alert.studioName} (double-booking).</li>
            ))}
          </ul>
        </div>
      )}

      <div className="occupancy-kpis">
        <KPICard title="Total estúdios" value={summary.totalStudios ?? 0} />
        <KPICard title="Livres agora" value={summary.availableStudios ?? 0} />
        <KPICard title="Em coaching" value={summary.occupiedStudios ?? 0} />
        <KPICard title="Ocupação agora" value={`${occupancyRate.toFixed(0)}%`} />
        <KPICard title="Utilização 7 dias" value={`${utilizationRate.toFixed(0)}%`} />
      </div>

      <article className="panel occupancy-sessions-panel">
        <div className="panel-header">
          <h3>Sessões de coaching</h3>
          <p>Agora e próximos 7 dias</p>
        </div>

        {sessionRows.length > 0 ? (
          <div className="table-wrap occupancy-sessions-table-wrap">
            <table className="occupancy-sessions-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Estúdio</th>
                  <th>Horário</th>
                  <th>Modalidade</th>
                  <th>Professor</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((session) => (
                  <tr key={`${session.timing}-${session.sessionId}-${session.studioId}`}>
                    <td>
                      <span className={`occupancy-session-status ${session.timing === 'active' ? 'active' : 'upcoming'}`}>
                        {session.timing === 'active' ? 'A decorrer' : 'Agendada'}
                      </span>
                    </td>
                    <td>{session.studioName}</td>
                    <td>{formatDateTime(session.startTime)} - {formatDateTime(session.endTime)}</td>
                    <td>{session.modality?.modalityName || 'Coaching'}</td>
                    <td>{formatSessionOwner(session)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="soft-box">Sem sessões de coaching a decorrer ou agendadas nos próximos 7 dias.</div>
        )}
      </article>

      <article className="panel occupancy-controls-panel">
        <div className="panel-header">
          <h3>Atualização rápida de ocupação</h3>
        </div>

        <form className="form-grid two occupancy-controls-form" onSubmit={handleSubmit}>
          <label>
            Estúdio
            <select
              value={selectedStudioId}
              onChange={(event) => setSelectedStudioId(event.target.value)}
            >
              {data.studios.map((studio) => (
                <option key={studio.studioId} value={studio.studioId}>
                  {studio.studioName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ação
            <select
              value={actionMode}
              onChange={(event) => setActionMode(event.target.value)}
            >
              <option value="status">Atualizar estado manual</option>
              <option value="block">Bloquear intervalo</option>
            </select>
          </label>

          <label>
            Estado
            <select
              value={manualStatus}
              onChange={(event) => setManualStatus(event.target.value)}
              disabled={actionMode === 'block'}
            >
              {MANUAL_STATUSES.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {STATUS_LABELS_PT[statusValue] || statusValue}
                </option>
              ))}
            </select>
          </label>

          {actionMode === 'block' ? (
            <label>
              Tipo de bloqueio
              <select
                value={blockType}
                onChange={(event) => setBlockType(event.target.value)}
              >
                {BLOCK_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {BLOCK_TYPE_LABELS_PT[value] || value}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            Início
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>

          <label>
            Fim
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              disabled={actionMode !== 'block' && manualStatus === 'available'}
            />
          </label>

          <label className="occupancy-reason-field">
            Motivo
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </label>

          <div className="card-actions form-actions">
            <button className="cta" type="submit" disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar atualização'}
            </button>
          </div>
        </form>

        {formNotice ? (
          <div className="soft-box occupancy-feedback" role="status" aria-live="polite">
            {formNotice}
          </div>
        ) : null}

        {formError ? (
          <div className="soft-box error occupancy-feedback" role="alert">
            {formError}
          </div>
        ) : null}
      </article>

      <div className="occupancy-section">
        <h2>Ocupação em tempo real</h2>
        <div className="occupancy-studios-grid">
          {data.studios.map(studio => (
            <StudioOccupancyCard
              key={studio.studioId}
              studio={studio}
              onBlock={handleCardBlock}
              onStatus={handleCardStatus}
              actionsDisabled={saving}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
