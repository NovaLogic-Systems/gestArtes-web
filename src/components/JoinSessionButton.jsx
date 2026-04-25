import { useMemo, useState } from 'react'
import api from '../services/api'
import Button from './ui/Button'

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

export default function JoinSessionButton({
  sessionId,
  availableSpots,
  currentParticipants,
  maxParticipants,
  disabled = false,
  className,
  onSuccess,
  onError,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  const remainingSpots = useMemo(
    () => resolveRemainingSpots({ availableSpots, currentParticipants, maxParticipants }),
    [availableSpots, currentParticipants, maxParticipants],
  )

  const hasSpots = remainingSpots !== null && remainingSpots > 0

  if (!sessionId || !hasSpots) {
    return null
  }

  async function handleJoinRequest() {
    if (submitting || submitted || disabled) {
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const response = await api.post(`/coaching/sessions/${sessionId}/join-requests`)
      setSubmitted(true)
      setMessage('Pedido de adesão enviado.')
      onSuccess?.(response?.data)
    } catch (requestError) {
      const backendMessage = requestError?.response?.data?.error
      const fallbackMessage = 'Não foi possível enviar o pedido de adesão.'
      const resolvedMessage = backendMessage || fallbackMessage

      setMessage(resolvedMessage)
      onError?.(requestError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={className}
      style={{
        alignItems: 'flex-start',
        display: 'grid',
        gap: '0.45rem',
      }}
    >
      <Button
        type="button"
        variant={submitted ? 'secondary' : 'cta'}
        size="sm"
        disabled={disabled || submitting || submitted}
        onClick={handleJoinRequest}
      >
        {submitting ? 'A enviar...' : submitted ? 'Pedido enviado' : 'Pedir adesão'}
      </Button>

      <small style={{ color: 'var(--text)', opacity: 0.9 }}>
        {remainingSpots} {remainingSpots === 1 ? 'vaga livre' : 'vagas livres'}
      </small>

      {message ? (
        <small
          role="status"
          style={{
            color: submitted ? '#15803d' : '#b91c1c',
            fontWeight: 600,
          }}
        >
          {message}
        </small>
      ) : null}
    </div>
  )
}
