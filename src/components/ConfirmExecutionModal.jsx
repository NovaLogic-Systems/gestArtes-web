/**
 * @file src/components/ConfirmExecutionModal.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { confirmCompletion } from '../services/coaching'

export default function ConfirmExecutionModal({
  open,
  session,
  onClose,
  onConfirmed,
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!session?.sessionId || saving) return
    setSaving(true)
    setError('')
    try {
      await confirmCompletion(session.sessionId)
      onConfirmed?.(session.sessionId)
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.error || 'Não foi possível confirmar a sessão.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (saving) return
    setError('')
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Confirmar execução da sessão"
      size="sm"
      className="coaching-modal"
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="cta" onClick={handleConfirm} disabled={saving} data-testid="confirm-exec-ok">
            {saving ? 'A confirmar…' : 'Sim, confirmar'}
          </Button>
        </div>
      }
    >
      <div className="bk-form">
        {error ? <div className="bk-error">{error}</div> : null}

        <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6 }}>
          Esta sessão teve lugar?
        </p>

        {session ? (
          <div className="bk-info" style={{ fontSize: '0.85rem' }}>
            <strong>Sessão #{session.sessionId}</strong>
            {session.startTime ? (
              <>
                {' · '}
                {new Date(session.startTime).toLocaleString('pt-PT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                })}
              </>
            ) : null}
            {session.studioName ? <> · {session.studioName}</> : null}
          </div>
        ) : null}

        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6d6480' }}>
          Ao confirmar, o estado da sessão passará a <strong>"A aguardar validação final da direção"</strong>.
        </p>
      </div>
    </Modal>
  )
}
