import { useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import Table from '../ui/Table'
import { cn } from '../ui/shared'
import { localizeApiError } from '../../utils/apiErrors'

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

function formatText(value, fallback = '—') {
  if (value == null || value === '') {
    return fallback
  }

  return String(value)
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(value)
  }

  return String(value)
}

function getRequestReference(request) {
  return request.reference ?? request.requestCode ?? `JR-${request.id}`
}

function AdminJoinRequestsSection({
  requests = [],
  loading = false,
  onApprove,
  onReject,
  onApproveSuccess,
  onRejectSuccess,
  onActionError,
  className,
  style,
}) {
  const [busyRequestId, setBusyRequestId] = useState(null)
  const [busyAction, setBusyAction] = useState(null)
  const [feedback, setFeedback] = useState(null)

  async function handleAction(request, action) {
    const callback = action === 'approve' ? onApprove : onReject

    if (typeof callback !== 'function') {
      return
    }

    if (busyRequestId !== null && busyRequestId !== request.id) {
      return
    }

    setBusyRequestId(request.id)
    setBusyAction(action)
    setFeedback(null)

    try {
      const result = await callback(request)
      const approved = action === 'approve'

      setFeedback({
        variant: 'success',
        title: approved ? 'Pedido aprovado' : 'Pedido rejeitado',
        description: `${getRequestReference(request)} foi processado com sucesso.`,
      })

      if (approved) {
        onApproveSuccess?.(request, result)
      } else {
        onRejectSuccess?.(request, result)
      }
    } catch (error) {
      setFeedback({
        variant: 'danger',
        title: 'Falha ao processar o pedido',
        description:
          localizeApiError(error, 'Não foi possível concluir a ação administrativa.'),
      })

      onActionError?.(error, request, action)
    } finally {
      setBusyRequestId(null)
      setBusyAction(null)
    }
  }

  const columns = [
    {
      key: 'request',
      header: 'Pedido',
      render: (request) => (
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          <strong style={{ color: 'var(--text-h)' }}>{getRequestReference(request)}</strong>
          <span style={{ color: 'var(--text)' }}>
            Sessão {formatText(request.sessionReference ?? request.sessionCode ?? `#${request.sessionId}`)}
          </span>
          <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
            {formatText(request.teacherName)} · {formatText(request.studentName)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (request) => {
        const teacherApproved = request.teacherApproved !== false
        const adminPending = request.adminDecision == null

        return (
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <Badge variant={teacherApproved ? 'success' : 'warning'} size="sm">
                {teacherApproved ? 'Professor aprovou' : 'Professor pendente'}
              </Badge>
              <Badge variant={adminPending ? 'info' : 'neutral'} size="sm">
                {adminPending ? 'Gestão pendente' : formatText(request.adminDecision)}
              </Badge>
            </div>
            <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>
              Submetido em {formatDateTime(request.requestedAt)}
            </span>
          </div>
        )
      },
    },
    {
      key: 'capacity',
      header: 'Capacidade',
      render: (request) => formatText(request.capacityLabel ?? request.capacityNote ?? 'Capacidade disponível'),
    },
    {
      key: 'remarks',
      header: 'Observações',
      render: (request) => formatText(request.notes ?? request.reason ?? '—'),
    },
  ]

  return (
    <section
      className={cn('admin-join-requests-section', className)}
      style={{ display: 'grid', gap: '1rem', textAlign: 'left', ...style }}
    >
      <header
        style={{
          alignItems: 'start',
          background: 'linear-gradient(145deg, #fff8f5, #f8f4fb)',
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
            AdVal1
          </Badge>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Pedidos de adesão em aprovação</h3>
            <p style={{ marginTop: '0.35rem', color: 'var(--text)' }}>
              Pedidos de entrada em sessões já aprovadas pelo professor. A gestão decide se mantém ou rejeita a
              adesão antes de a vaga ficar oficialmente confirmada.
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
            {requests.length}
          </strong>
          <span style={{ color: 'var(--text)' }}>pedidos pendentes</span>
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
          rows={requests}
          compact
          emptyState="Sem pedidos de adesão em espera de aprovação."
          renderRowActions={(request) => {
            const isCurrentBusy = busyRequestId === request.id
            const isAnyBusy = busyRequestId !== null && busyRequestId !== request.id
            const teacherApproved = request.teacherApproved !== false
            const approvalAvailable = teacherApproved && typeof onApprove === 'function'
            const rejectionAvailable = typeof onReject === 'function'
            const isLocked = isAnyBusy || isCurrentBusy

            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                <Button
                  variant="cta"
                  size="sm"
                  disabled={isLocked || !approvalAvailable}
                  onClick={() => handleAction(request, 'approve')}
                  title={
                    !teacherApproved
                      ? 'O professor ainda não aprovou este pedido.'
                      : undefined
                  }
                >
                  {isCurrentBusy && busyAction === 'approve' ? 'A aprovar...' : 'Aprovar'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isLocked || !rejectionAvailable}
                  onClick={() => handleAction(request, 'reject')}
                >
                  {isCurrentBusy && busyAction === 'reject' ? 'A rejeitar...' : 'Rejeitar'}
                </Button>
              </div>
            )
          }}
        />
      )}
    </section>
  )
}

export default AdminJoinRequestsSection
export { AdminJoinRequestsSection }
