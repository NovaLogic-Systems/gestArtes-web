/**
 * @file src/components/JoinSessionButton.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Button from './ui/Button'
import Badge from './ui/Badge'
import Modal from './ui/Modal'
import { canJoinSession } from '../utils/coachingSession'
import { localizeApiError } from '../utils/apiErrors'

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
  pending_teacher: { label: 'Aguarda professor', variant: 'warning' },
  pendingteacher: { label: 'Aguarda professor', variant: 'warning' },
  awaiting_approval: { label: 'Aguarda professor', variant: 'warning' },
  awaitingapproval: { label: 'Aguarda professor', variant: 'warning' },
  pending_approval: { label: 'Aguarda professor', variant: 'warning' },
  pendingapproval: { label: 'Aguarda professor', variant: 'warning' },
  pending_admin: { label: 'Aguarda direção', variant: 'warning' },
  pendingadmin: { label: 'Aguarda direção', variant: 'warning' },
  teacher_approved: { label: 'Aguarda direção', variant: 'warning' },
  teacherapproved: { label: 'Aguarda direção', variant: 'warning' },
  approved: { label: 'Aprovado', variant: 'success' },
  admin_approved: { label: 'Aprovado', variant: 'success' },
  adminapproved: { label: 'Aprovado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'danger' },
  not_approved: { label: 'Não aprovado', variant: 'danger' },
  notapproved: { label: 'Não aprovado', variant: 'danger' },
  teacher_rejected: { label: 'Rejeitado pelo professor', variant: 'danger' },
  teacherrejected: { label: 'Rejeitado pelo professor', variant: 'danger' },
  admin_rejected: { label: 'Rejeitado pela direção', variant: 'danger' },
  adminrejected: { label: 'Rejeitado pela direção', variant: 'danger' },
}

function isSessionJoinable(status) {
  const s = String(status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  if (!s) {
    return false
  }

  const blockedMarkers = ['finaliz', 'validat', 'conclu', 'complete', 'finish', 'closed', 'cancel', 'reject', 'archiv', 'ended']
  if (blockedMarkers.some((marker) => s.includes(marker))) {
    return false
  }

  return s === 'approved' || s.includes('pending') || s.includes('aprov') || s.includes('schedul') || s.includes('agend')
}

export default function JoinSessionButton({
  sessionId,
  sessionStatus,
  sessionStartTime,
  sessionEndTime,
  availableSpots,
  currentParticipants,
  maxParticipants,
  initialRequestStatus = null,
  userIsEnrolled = false,
  disabled = false,
  className,
  onSuccess,
  onError,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [requestStatus, setRequestStatus] = useState(initialRequestStatus)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Sync internal state with prop changes (e.g. after a parent re-fetch)
  useEffect(() => {
    if (initialRequestStatus !== undefined) {
      setRequestStatus(initialRequestStatus)
    }
  }, [initialRequestStatus])

  const remainingSpots = useMemo(
    () => resolveRemainingSpots({ availableSpots, currentParticipants, maxParticipants }),
    [availableSpots, currentParticipants, maxParticipants],
  )

  const hasSpots = remainingSpots !== null && remainingSpots > 0
  const joinable = canJoinSession({
    sessionStatus,
    sessionStartTime,
    sessionEndTime,
    userIsEnrolled,
    hasSpots,
  })
  const badgeInfo = userIsEnrolled
    ? { label: 'Já inscrito', variant: 'success' }
    : requestStatus
      ? (statusMap[String(requestStatus || '').toLowerCase().trim().replace(/ /g, '_')] || { label: 'Estado desconhecido', variant: 'neutral' })
      : null

  if (!sessionId || (!joinable && !badgeInfo)) {
    return null
  }

  async function handleJoinRequest() {
    if (submitting || disabled) return

    setSubmitting(true)
    setErrorMessage('')
    try {
      const { data } = await api.post(`/coaching/sessions/${sessionId}/join-requests`)
      const newStatus = data?.status || 'pending_teacher'
      setRequestStatus(newStatus)
      setIsModalOpen(false)
      onSuccess?.({ ...data, status: newStatus, alreadyExisted: false })
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setRequestStatus('pending_teacher')
        setIsModalOpen(false)
        onSuccess?.({ status: 'pending_teacher', alreadyExisted: true })
      } else {
        setErrorMessage(localizeApiError(err, 'Não foi possível enviar o pedido. Tenta novamente.'))
      }
      onError?.(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={className} style={{ display: 'grid', gap: '0.45rem', alignItems: 'flex-start' }}>
      {!badgeInfo ? (
        <Button
          type="button"
          variant="cta"
          size="sm"
          disabled={disabled || submitting}
          onClick={() => setIsModalOpen(true)}
        >
          Aderir
        </Button>
      ) : (
        <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
      )}

      {!badgeInfo && (
        <small style={{ color: 'var(--text)', opacity: 0.9 }}>
          {remainingSpots} {remainingSpots === 1 ? 'vaga livre' : 'vagas livres'}
        </small>
      )}

      {errorMessage ? (
        <small style={{ color: '#b91c1c' }}>{errorMessage}</small>
      ) : null}

      <Modal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setErrorMessage('') }}
        title="Confirmar adesão"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); setErrorMessage('') }} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="cta" onClick={handleJoinRequest} disabled={submitting}>
              {submitting ? 'A enviar…' : 'Confirmar'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>Pretendes aderir a esta sessão? O professor recebe o pedido e, se aprovar, segue para validação final pela direção.</p>
        {errorMessage ? (
          <p style={{ margin: '12px 0 0', color: '#b91c1c', fontSize: '0.875rem' }}>{errorMessage}</p>
        ) : null}
      </Modal>
    </div>
  )
}