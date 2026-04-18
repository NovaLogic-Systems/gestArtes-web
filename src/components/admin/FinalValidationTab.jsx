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
  return session.reference ?? session.sessionCode ?? `#${session.id}`
}

function FinalValidationTab({
  sessions = [],
  loading = false,
  onFinalize,
  onFinalizeSuccess,
  onFinalizeError,
  className,
  style,
}) {
  const [busySessionId, setBusySessionId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  async function handleFinalize(session) {
    if (busySessionId !== null && busySessionId !== session.id) {
      return
    }

    setBusySessionId(session.id)
    setFeedback(null)

    try {
      const result = onFinalize
        ? await onFinalize(session)
        : await api.patch(`/admin/sessions/${session.id}/finalize-validation`)

      setFeedback({
        variant: 'success',
        title: 'Sessão finalizada',
        description: `A sessão ${getSessionReference(session)} foi validada e o lançamento financeiro foi criado.`,
      })

      onFinalizeSuccess?.(session, result)
    } catch (error) {
      setFeedback({
        variant: 'danger',
        title: 'Falha ao finalizar',
        description:
          error?.response?.data?.error ?? error?.message ?? 'Não foi possível concluir a validação final.',
      })

      onFinalizeError?.(error, session)
    } finally {
      setBusySessionId(null)
    }
  }

  const columns = [
    {
      key: 'session',
      header: 'Sessão',
      render: (session) => (
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          <strong style={{ color: 'var(--text-h)' }}>{getSessionReference(session)}</strong>
          <span style={{ color: 'var(--text)' }}>
            {formatText(session.title ?? session.sessionTitle ?? session.label)}
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
      render: (session) => {
        const teacherConfirmed = session.teacherConfirmed !== false
        const studentConfirmed = session.studentConfirmed !== false

        return (
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <Badge variant={teacherConfirmed ? 'success' : 'warning'} size="sm">
                {teacherConfirmed ? 'Professor' : 'Professor pendente'}
              </Badge>
              <Badge variant={studentConfirmed ? 'success' : 'warning'} size="sm">
                {studentConfirmed ? 'Aluno' : 'Aluno pendente'}
              </Badge>
            </div>
            <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
              {formatText(session.confirmationLabel ?? 'Confirmação dupla recebida')}
            </span>
          </div>
        )
      },
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
      <header
        style={{
          alignItems: 'start',
          background: 'linear-gradient(145deg, #fff8f5, #f1fbf8)',
          border: '1px solid var(--border)',
          borderRadius: '1.25rem',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <Badge variant="info" size="sm">
            AdVal2
          </Badge>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Validações finais</h3>
            <p style={{ marginTop: '0.35rem', color: 'var(--text)' }}>
              Sessões em que professor e aluno já confirmaram a ocorrência. O clique em Finalize chama{' '}
              <code style={{ padding: 0, background: 'transparent' }}>PATCH /admin/sessions/&lt;id&gt;/finalize-validation</code>{' '}
              e dispara a criação do lançamento financeiro.
            </p>
          </div>
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
            {sessions.length}
          </strong>
          <span style={{ color: 'var(--text)' }}>sessões prontas para fecho</span>
        </div>
      </header>

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
          <strong style={{ color: feedbackStyles[feedback.variant].accent, display: 'block', marginBottom: '0.25rem' }}>
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
          rows={sessions}
          compact
          emptyState="Sem sessões prontas para validação final."
          renderRowActions={(session) => {
            const isCurrentBusy = busySessionId === session.id
            const isAnyBusy = busySessionId !== null && busySessionId !== session.id
            const teacherConfirmed = session.teacherConfirmed !== false
            const studentConfirmed = session.studentConfirmed !== false
            const readyForFinalize = teacherConfirmed && studentConfirmed
            const isLocked = Boolean(session.isFinalized) || !readyForFinalize || isAnyBusy || isCurrentBusy

            return (
              <Button
                variant="cta"
                size="sm"
                disabled={isLocked}
                onClick={() => handleFinalize(session)}
                title={
                  !readyForFinalize
                    ? 'A sessão ainda não recebeu as duas confirmações.'
                    : undefined
                }
              >
                {isCurrentBusy ? 'A finalizar...' : 'Finalizar'}
              </Button>
            )
          }}
        />
      )}
    </section>
  )
}

export default FinalValidationTab
export { FinalValidationTab }
