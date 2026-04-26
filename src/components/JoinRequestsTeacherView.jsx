import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Badge from './ui/Badge'
import Button from './ui/Button'
import LoadingSkeleton from './ui/LoadingSkeleton'
import Modal from './ui/Modal'
import Table from './ui/Table'
import Toast from './ui/Toast'

function resolveStatusVariant(status) {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized.includes('reject') || normalized.includes('rejeit')) return 'danger'
  if (normalized.includes('approve') && normalized.includes('teacher')) return 'warning'
  if (normalized.includes('approve') || normalized.includes('admin')) return 'success'
  if (normalized.includes('pend')) return 'warning'
  return 'neutral'
}

function resolveStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase()
  if (!normalized) return 'Pendente'
  if (normalized.includes('reject') || normalized.includes('rejeit')) return 'Rejeitado'
  if (normalized.includes('approve') && normalized.includes('teacher')) return 'Aguardando gestão'
  if (normalized.includes('approve') || normalized.includes('admin')) return 'Aprovado'
  if (normalized.includes('pend')) return 'Pendente'
  return status
}

export default function JoinRequestsTeacherView() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [decision, setDecision] = useState('approve')
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [toast, setToast] = useState(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/coaching/join-requests/teacher-pending')
      const payload = response.data?.requests || response.data || []
      setRequests(Array.isArray(payload) ? payload : [])
    } catch { setError('Não foi possível carregar os pedidos de adesão.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const openReviewModal = useCallback((request, initialDecision) => {
    setSelectedRequest(request)
    setDecision(initialDecision)
    setObservations('')
    setReviewError('')
  }, [])

  const closeReviewModal = useCallback(() => {
    if (saving) return
    setSelectedRequest(null)
    setObservations('')
    setReviewError('')
  }, [saving])

  const handleReviewSubmit = useCallback(async () => {
    if (!selectedRequest || saving) return

    const normalizedObservations = observations.trim()

    if (decision === 'reject' && !normalizedObservations) {
      setReviewError('As observações são obrigatórias quando rejeitas o pedido.')
      return
    }

    setSaving(true)
    setReviewError('')

    const reqId = selectedRequest.id || selectedRequest.JoinRequestID || selectedRequest.joinRequestId

    const endpoint = decision === 'approve'
      ? `/coaching/join-requests/${reqId}/teacher-approve`
      : `/coaching/join-requests/${reqId}/teacher-reject`

    try {
      await api.patch(endpoint, { observations: normalizedObservations })

      setRequests((current) => current.map(req => {
        const id = req.id || req.JoinRequestID || req.joinRequestId
        if (id === reqId) {
          return {
            ...req,
            status: decision === 'approve' ? 'PendingAdmin' : 'Rejected',
            statusName: decision === 'approve' ? 'Aguardando gestão' : 'Rejeitado'
          }
        }
        return req
      }))

      setToast({
        title: decision === 'approve' ? 'Aprovado' : 'Rejeitado',
        description: decision === 'approve' ? 'Pedido enviado para a gestão.' : 'Pedido rejeitado.',
        variant: 'success'
      })
      closeReviewModal()
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Não foi possível guardar a decisão.')
    } finally {
      setSaving(false)
    }
  }, [decision, observations, selectedRequest, saving, closeReviewModal])

  const columns = useMemo(() => [
    {
      key: 'student',
      header: 'Estudante',
      render: (req) => req.studentName || req.studentFirstName || 'Estudante'
    },
    {
      key: 'session',
      header: 'Sessão',
      render: (req) => req.sessionLabel || req.sessionName || `#${req.sessionId || req.SessionID}`
    },
    {
      key: 'date',
      header: 'Data/Hora',
      render: (req) => req.sessionDate ? new Date(req.sessionDate).toLocaleDateString('pt-PT') : '—'
    },
    {
      key: 'status',
      header: 'Estado',
      render: (req) => {
        const st = req.statusName || req.status
        return <Badge variant={resolveStatusVariant(st)}>{resolveStatusLabel(st)}</Badge>
      }
    },
    {
      key: 'actions',
      header: '',
      render: (req) => {
        const isPendingTeacher = String(req.statusName || req.status).toLowerCase().includes('pendingteacher') ||
          String(req.statusName || req.status).toLowerCase() === 'pendente'

        if (!isPendingTeacher) return null

        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => openReviewModal(req, 'approve')}>
              Aprovar
            </Button>
            <Button variant="danger" size="sm" onClick={() => openReviewModal(req, 'reject')}>
              Rejeitar
            </Button>
          </div>
        )
      }
    }
  ], [openReviewModal])

  if (loading) {
    return (
      <div className="join-requests-teacher-view">
        <LoadingSkeleton variant="block" height="200px" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="join-requests-teacher-view error-state">
        <p>{error}</p>
        <Button onClick={loadRequests}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="join-requests-teacher-view">
      <Table
        columns={columns}
        rows={requests}
        getRowKey={(req) => req.id || req.JoinRequestID || req.joinRequestId || Math.random()}
        emptyState="Sem pedidos pendentes."
      />

      <Modal
        open={Boolean(selectedRequest)}
        title={decision === 'approve' ? 'Aprovar Pedido' : 'Rejeitar Pedido'}
        onClose={closeReviewModal}
        footer={
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeReviewModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant={decision === 'approve' ? 'cta' : 'danger'}
              onClick={handleReviewSubmit}
              disabled={saving}
            >
              {saving ? 'A guardar...' : 'Confirmar'}
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p>
              Estás a {decision === 'approve' ? 'aprovar' : 'rejeitar'} o pedido de{' '}
              <strong>{selectedRequest.studentName || selectedRequest.studentFirstName || 'Estudante'}</strong> para a sessão{' '}
              <strong>{selectedRequest.sessionLabel || selectedRequest.sessionName || `#${selectedRequest.sessionId || selectedRequest.SessionID}`}</strong>.
            </p>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span>Observações {decision === 'reject' ? '(obrigatório)' : '(opcional)'}</span>
              <textarea
                rows={4}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Insere uma nota..."
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </label>

            {reviewError && <p style={{ color: 'red' }}>{reviewError}</p>}
          </div>
        )}
      </Modal>

      {toast && (
        <Toast
          open
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          onClose={() => setToast(null)}
          style={{ position: 'fixed', right: '1.25rem', bottom: '1.25rem', zIndex: 60, background: '#ffffff', color: '#1f1c2e' }}
        />
      )}
    </div>
  )
}

