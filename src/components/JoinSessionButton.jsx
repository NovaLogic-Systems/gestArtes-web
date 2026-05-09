/**
 * @file src/components/JoinSessionButton.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useMemo, useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import api, { getAccessToken } from '../services/api'
import { getSocketUrl } from '../utils/network'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Modal from './ui/Modal'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveRemainingSpots({ availableSpots, currentParticipants, maxParticipants }) {
  const directAvailable = toNumber(availableSpots)
  if (directAvailable !== null) {
    return Math.max(0, Math.trunc(directAvailable))
  }

  const current = toNumber(currentParticipants)
  const max = toNumber(maxParticipants)

  if (current === null || max === null) {
    return null
  }

  return Math.max(0, Math.trunc(max - current))
}

const statusMap = {
  'pending_teacher': { label: 'Pending Teacher', variant: 'warning' },
  'pending_admin': { label: 'Pending Admin', variant: 'warning' },
  'approved': { label: 'Approved', variant: 'success' },
  'rejected': { label: 'Rejected', variant: 'danger' },
}

export default function JoinSessionButton({
  sessionId,
  sessionStatus,
  availableSpots,
  currentParticipants,
  maxParticipants,
  disabled = false,
  className,
  onSuccess,
  onError,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [requestStatus, setRequestStatus] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const remainingSpots = useMemo(
    () => resolveRemainingSpots({ availableSpots, currentParticipants, maxParticipants }),
    [availableSpots, currentParticipants, maxParticipants],
  )

  const hasSpots = remainingSpots !== null && remainingSpots > 0

  useEffect(() => {
    async function fetchMyStatus() {
      if (!sessionId) return
      try {
        const { data } = await api.get('/coaching/join-requests/my')
        const req = data?.find(r => Number(r.sessionId) === Number(sessionId))
        if (req) setRequestStatus(req.status)
      } catch { 
        // ignore
      }
    }
    fetchMyStatus()
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    const socketUrl = getSocketUrl()

    if (!socketUrl) return undefined

    const socket = io(socketUrl, {
      withCredentials: true,
      auth: {
        accessToken: getAccessToken(),
      },
    })

    socket.on('notification', () => {
      api.get('/coaching/join-requests/my')
        .then(({ data }) => {
          const req = data?.find(r => Number(r.sessionId) === Number(sessionId))
          if (req) setRequestStatus(req.status)
        })
        .catch(() => {})
    })

    return () => {
      socket.disconnect()
    }
  }, [sessionId])

  if (!sessionId || !hasSpots || sessionStatus !== 'Approved') {
    return null
  }

  async function handleJoinRequest() {
    if (submitting || disabled) return

    setSubmitting(true)
    try {
      const { data } = await api.post(`/coaching/sessions/${sessionId}/join-requests`)
      setRequestStatus(data?.status || 'pending_teacher')
      setIsModalOpen(false)
      onSuccess?.(data)
    } catch (err) {
      onError?.(err)
    } finally {
      setSubmitting(false)
    }
  }

  const badgeInfo = requestStatus ? statusMap[requestStatus] || { label: requestStatus, variant: 'neutral' } : null

  return (
    <div className={className} style={{ display: 'grid', gap: '0.45rem', alignItems: 'flex-start' }}>
      {!requestStatus ? (
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={disabled || submitting}
          onClick={() => setIsModalOpen(true)}
        >
          Pedir adesão
        </Button>
      ) : (
        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
      )}

      {!requestStatus && (
        <small style={{ color: 'var(--text)', opacity: 0.9 }}>
          {remainingSpots} {remainingSpots === 1 ? 'vaga livre' : 'vagas livres'}
        </small>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirmar Adesão"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="cta" onClick={handleJoinRequest} disabled={submitting}>
              {submitting ? 'A enviar...' : 'Confirmar'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>Tem a certeza que deseja pedir adesão a esta sessão?</p>
      </Modal>
    </div>
  )
}