import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function VerifyReturnModal({ rentalId, open = true, onClose, onSubmit }) {
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await onSubmit(rentalId, {
        returnDate: new Date().toISOString(),
        conditionStatus: condition,
        conditionNotes: notes || null,
      })
    } catch {
      // swallow — parent shows errors
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Verificar Devolução" description="Classifica o estado do artigo e confirma a devolução.">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <label>
          <span>Estado do artigo</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="good">Bom</option>
            <option value="damaged">Danificado</option>
            <option value="lost">Perdido</option>
          </select>
        </label>

        <label>
          <span>Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              borderRadius: '0.875rem',
              border: '1px solid var(--border)',
              padding: '0.75rem 0.9rem',
              font: 'inherit',
              resize: 'vertical',
            }}
            placeholder="Observações sobre o estado do artigo e possíveis danos"
          />
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>{busy ? 'A validar...' : 'Confirmar devolução'}</Button>
        </div>
      </form>
    </Modal>
  )
}
