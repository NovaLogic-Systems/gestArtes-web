import { useState } from 'react'
import api from '../../services/api'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import Table from '../ui/Table'
import { cn } from '../ui/shared'

const currencyFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
})

const feedbackStyles = {
  success: {
    accent: '#16a34a',
    background: 'rgba(22, 163, 74, 0.08)',
    border: 'rgba(22, 163, 74, 0.2)',
  },
  danger: {
    accent: '#dc2626',
    background: 'rgba(220, 38, 38, 0.08)',
    border: 'rgba(220, 38, 38, 0.2)',
  },
}

function formatMoney(value) {
  if (value == null || value === '') {
    return '—'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return currencyFormatter.format(value)
  }

  return String(value)
}

function formatText(value, fallback = '—') {
  if (value == null || value === '') {
    return fallback
  }

  return String(value)
}

function getSessionReference(session) {
  return session.reference ?? session.sessionReference ?? session.sessionCode ?? `#${session.id ?? session.sessionId}`
}

function getSessionId(session) {
  const id = session.id ?? session.sessionId
  return Number(id)
}

function getDurationHours(session) {
  if (!session.startTime || !session.endTime) {
    return 0
  }

  const start = new Date(session.startTime)
  const end = new Date(session.endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0
  }

  return Math.max((end.getTime() - start.getTime()) / 3_600_000, 0)
}

function calculateBasePrice(session) {
  if (session.basePriceLabel != null || session.basePrice != null) {
    return session.basePriceLabel ?? session.basePrice
  }

  const hourlyRate = Number(session.hourlyRate || 0)
  return Number((getDurationHours(session) * hourlyRate).toFixed(2))
}

function calculateFinalPrice(session, basePrice) {
  if (session.finalPriceLabel != null || session.finalPrice != null) {
    return session.finalPriceLabel ?? session.finalPrice
  }

  let price = Number(basePrice || 0)

  if (session.isOutsideStdHours) {
    price *= 1.5
  }

  if (session.isExternal) {
    price *= 1
  }

  return Number(price.toFixed(2))
}

function buildAdjustmentLabel(session, basePrice, finalPrice) {
  if (session.adjustmentLabel != null || session.adjustment != null) {
    return session.adjustmentLabel ?? session.adjustment
  }

  const delta = Number((Number(finalPrice || 0) - Number(basePrice || 0)).toFixed(2))

  if (delta === 0) {
    return '+0,00 €'
  }

  if (session.isOutsideStdHours) {
    return `+${formatMoney(Math.abs(delta))} (extra-hora)`
  }

  return delta > 0 ? `+${formatMoney(delta)}` : `-${formatMoney(Math.abs(delta))}`
}

function isConfirmed(value) {
  return value !== false && value !== 0 && value !== 'false'
}

function normalizeSession(session) {
  const sessionId = getSessionId(session)
  const basePriceLabel = calculateBasePrice(session)
  const finalPriceLabel = calculateFinalPrice(session, basePriceLabel)

  return {
    ...session,
    id: Number.isFinite(sessionId) ? sessionId : session.sessionId,
    reference: getSessionReference(session),
    teacherConfirmed: isConfirmed(session.teacherConfirmed),
    studentConfirmed: isConfirmed(session.studentConfirmed),
    basePriceLabel,
    finalPriceLabel,
    adjustmentLabel: buildAdjustmentLabel(session, basePriceLabel, finalPriceLabel),
    title: session.title ?? session.sessionTitle ?? session.label,
    teacherName: session.teacherName,
    studentName: session.studentName,
    confirmationLabel:
      session.confirmationLabel ??
      (Number(session.confirmationCount ?? 0) >= 2
        ? 'Professor e aluno confirmaram a sessão'
        : 'Confirmações pendentes'),
  }
}

function FinalValidationTab({
  sessions = [],
  loading = false,
  className,
  style,
  error = '',
  onFinalize,
  onFinalizeSuccess,
  onFinalizeError,
}) {
  const [busySessionId, setBusySessionId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  async function handleFinalize(session) {
    const sessionId = getSessionId(session)

    if (!Number.isFinite(sessionId) || busySessionId !== null) {
      return
    }

    setBusySessionId(sessionId)
    setFeedback(null)

    try {
      const result = onFinalize
        ? await onFinalize(session)
        : await api.patch(`/admin/sessions/${sessionId}/finalize-validation`)

      setFeedback({
        variant: 'success',
        title: 'Sessão finalizada',
        description: `A sessão ${getSessionReference(session)} foi validada e o lançamento financeiro foi criado.`,
      })

      onFinalizeSuccess?.(session, result)
    } catch (requestError) {
      setFeedback({
        variant: 'danger',
        title: 'Falha ao finalizar',
        description:
          requestError?.response?.data?.error ?? requestError?.message ?? 'Não foi possível concluir a validação final.',
      })

      onFinalizeError?.(requestError, session)
    } finally {
      setBusySessionId(null)
    }
  }

  const normalizedSessions = sessions.map(normalizeSession)

  const columns = [
    {
      key: 'session',
      header: 'Sessão',
      render: (session) => (
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          <strong style={{ color: 'var(--text-h)' }}>{getSessionReference(session)}</strong>
          <span style={{ color: 'var(--text)' }}>
            {formatText(session.title)}
          </span>
          <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
            {formatText(session.teacherName)} · {formatText(session.studentName)}
          </span>
        </div>
      ),
    },
    {
      key: 'confirmations',
      header: 'Confirmações',
      render: (session) => (
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            <Badge variant={session.teacherConfirmed ? 'success' : 'warning'} size="sm">
              {session.teacherConfirmed ? 'Professor' : 'Professor pendente'}
            </Badge>
            <Badge variant={session.studentConfirmed ? 'success' : 'warning'} size="sm">
              {session.studentConfirmed ? 'Aluno' : 'Aluno pendente'}
            </Badge>
          </div>
          <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
            {formatText(session.confirmationLabel ?? 'Confirmação dupla recebida')}
          </span>
        </div>
      ),
    },
    {
      key: 'basePrice',
      header: 'Preço base',
      render: (session) => formatMoney(session.basePriceLabel ?? session.basePrice),
    },
    {
      key: 'adjustment',
      header: 'Ajuste',
      render: (session) => formatText(session.adjustmentLabel ?? session.adjustment),
    },
    {
      key: 'finalPrice',
      header: 'Valor final',
      render: (session) => formatMoney(session.finalPriceLabel ?? session.finalPrice),
    },
  ]

  return (
    <section
      className={cn('admin-final-validation-tab', className)}
      style={{ display: 'grid', gap: '1rem', textAlign: 'left', ...style }}
    >
      <div className="panel-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <Badge variant="info" size="sm">
            AdVal2
          </Badge>
          <h3 style={{ marginTop: '0.6rem' }}>Validações finais</h3>
          <p>
            Sessões em que professor e aluno já confirmaram a ocorrência. O clique em Finalize chama{' '}
            <code style={{ padding: 0, background: 'transparent' }}>PATCH /admin/sessions/&lt;id&gt;/finalize-validation</code>{' '}
            e dispara a criação do lançamento financeiro.
          </p>
        </div>
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '1rem',
            minWidth: '10rem',
            padding: '0.85rem 1rem',
          }}
        >
          <strong style={{ color: 'var(--text-h)', display: 'block', fontSize: '1.25rem' }}>
            {normalizedSessions.length}
          </strong>
          <span style={{ color: 'var(--text)' }}>sessões prontas para fecho</span>
        </div>
      </div>

      {error ? <div className="soft-box error">{error}</div> : null}

      {feedback ? (
        <div
          role="status"
          style={{
            background: feedbackStyles[feedback.variant].background,
            border: `1px solid ${feedbackStyles[feedback.variant].border}`,
            borderRadius: '1rem',
            color: 'var(--text-h)',
            padding: '0.9rem 1rem',
          }}
        >
          <strong
            style={{
              color: feedbackStyles[feedback.variant].accent,
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            {feedback.title}
          </strong>
          <span style={{ color: 'var(--text)' }}>{feedback.description}</span>
        </div>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="block" lines={4} />
      ) : (
        <Table
          columns={columns}
          rows={normalizedSessions}
          compact
          emptyState="Sem sessões prontas para validação final."
          renderRowActions={(session) => (
            <Button
              variant="cta"
              size="sm"
              disabled={Boolean(session.isFinalized) || busySessionId !== null}
              onClick={() => void handleFinalize(session)}
              title={
                !isConfirmed(session.teacherConfirmed) || !isConfirmed(session.studentConfirmed)
                  ? 'A sessão ainda não recebeu as duas confirmações.'
                  : undefined
              }
            >
              {busySessionId === session.id ? 'A finalizar...' : 'Finalizar'}
            </Button>
          )}
        />
      )}
    </section>
  )
}

export default FinalValidationTab
