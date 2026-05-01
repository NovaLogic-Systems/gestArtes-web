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
