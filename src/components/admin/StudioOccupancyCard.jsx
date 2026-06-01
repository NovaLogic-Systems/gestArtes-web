/**
 * @file src/components/admin/StudioOccupancyCard.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import React from 'react'
import Badge from '../ui/Badge'

export default function StudioOccupancyCard({ studio, onBlock, onStatus, actionsDisabled = false }) {
  const isOccupied = studio.status === 'occupied'
  const isBlocked = ['blocked', 'maintenance', 'unavailable'].includes(studio.status)
  const isDoubleBooked = studio.status === 'double-booked'
  const cardStatus = isDoubleBooked ? 'double-booked' : isBlocked ? 'blocked' : isOccupied ? 'occupied' : 'available'

  let badgeColor = 'success'
  let statusText = 'Livre'

  if (isDoubleBooked) {
    badgeColor = 'danger'
    statusText = 'Sobreposição (Double-Booking)'
  } else if (isBlocked) {
    badgeColor = 'danger'
    statusText = 'Bloqueado'
  } else if (isOccupied) {
    badgeColor = 'warning'
    statusText = 'Em Aula'
  }

  const formatTime = (isoString) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatSessionTime = (session) => {
    const start = formatTime(session.startTime)
    const end = formatTime(session.endTime)
    return [start, end].filter(Boolean).join(' - ')
  }

  const activeSessions = Array.isArray(studio.activeSessions) ? studio.activeSessions : []
  const upcomingSessions = Array.isArray(studio.upcomingSessions) ? studio.upcomingSessions : []
  const visibleActiveSessions = activeSessions.length
    ? activeSessions
    : studio.activeSessionId
      ? [{
          sessionId: studio.activeSessionId,
          startTime: null,
          endTime: studio.occupiedUntil,
          modality: null,
          currentUser: studio.currentUser,
        }]
      : []

  return (
    <article className={`occupancy-card occupancy-card-${cardStatus}`}>
      <div className="occupancy-card-head">
        <h3>{studio.studioName}</h3>
        <Badge variant={badgeColor}>{statusText}</Badge>
      </div>

      <div className="occupancy-card-body">
        <p><strong>Capacidade:</strong> {studio.capacity}</p>

        {isOccupied && studio.currentUser && (
          <p>
            <strong>Professor:</strong> {studio.currentUser.fullName}
          </p>
        )}

        {(isOccupied || isBlocked || isDoubleBooked) && studio.occupiedUntil && (
          <p className="occupancy-card-until">
            Ocupado até {formatTime(studio.occupiedUntil)}
          </p>
        )}

        {visibleActiveSessions.length > 0 ? (
          <div className="occupancy-session-list">
            <strong>Sessões a decorrer</strong>
            {visibleActiveSessions.map((session) => (
              <div key={session.sessionId} className="occupancy-session-row">
                <span>{formatSessionTime(session) || 'Agora'}</span>
                <span>
                  {session.modality?.modalityName || 'Coaching'}
                  {session.currentUser?.fullName ? ` · ${session.currentUser.fullName}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {upcomingSessions.length > 0 ? (
          <div className="occupancy-session-list">
            <strong>Sessões marcadas</strong>
            {upcomingSessions.map((session) => (
              <div key={session.sessionId} className="occupancy-session-row">
                <span>{formatSessionTime(session)}</span>
                <span>
                  {session.modality?.modalityName || 'Coaching'}
                  {session.currentUser?.fullName ? ` · ${session.currentUser.fullName}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="occupancy-card-actions">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => onStatus?.(studio)}
          disabled={actionsDisabled}
        >
          Atualizar estado
        </button>
        <button
          type="button"
          className="danger-btn"
          onClick={() => onBlock?.(studio)}
          disabled={actionsDisabled}
        >
          Bloquear
        </button>
      </div>
    </article>
  )
}
