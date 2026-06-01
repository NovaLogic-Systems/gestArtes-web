import { useState } from 'react'
import api from '../../services/api'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { localizeApiError } from '../../utils/apiErrors'

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8,    message: 'Mínimo 8 caracteres' },
  { test: (p) => /[A-Z]/.test(p),  message: 'Pelo menos uma letra maiúscula' },
  { test: (p) => /[a-z]/.test(p),  message: 'Pelo menos uma letra minúscula' },
  { test: (p) => /[0-9]/.test(p),  message: 'Pelo menos um número' },
]

function getPasswordErrors(password) {
  if (!password) return []
  return PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.message)
}

function extractApiErrors(err) {
  const data = err?.response?.data
  if (data?.errors && Array.isArray(data.errors)) {
    return data.errors.map((e) => e.msg).filter(Boolean).join(' ')
  }
  if (data?.details && Array.isArray(data.details)) {
    return data.details.map((e) => e.msg).filter(Boolean).join(' ')
  }
  return null
}

export default function ResetPasswordModal({ userId, userName, onClose }) {
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)

  const validationErrors = getPasswordErrors(newPassword)
  const isValid = validationErrors.length === 0 && newPassword.length > 0

  const handleSubmit = async () => {
    setTouched(true)
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      await api.patch(`/admin/users/${userId}/reset-password`, { newPassword })
      setSuccess(true)
    } catch (err) {
      const apiMsg = extractApiErrors(err)
      setError(apiMsg || localizeApiError(err, 'Não foi possível redefinir a senha.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Redefinir senha — ${userName}`} size="sm">
      {success ? (
        <div className="soft-box" style={{ marginBottom: '1rem', borderLeft: '4px solid #10b981' }}>
          Senha redefinida com sucesso. Comunique a nova senha diretamente ao utilizador (pessoalmente ou por telefone).
        </div>
      ) : (
        <>
          {error && <div className="soft-box error" style={{ marginBottom: '1rem' }} role="alert">{error}</div>}
          <div style={{ marginBottom: '0.75rem' }}>
            <Input
              label="Nova senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mín. 8 caracteres"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setTouched(true) }}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0, display: 'flex' }}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
          </div>
          {(touched || newPassword.length > 0) && (
            <ul style={{ margin: '0 0 1rem', padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(newPassword)
                return (
                  <li key={rule.message} style={{ fontSize: '0.82rem', color: ok ? '#059669' : 'var(--text-danger, #dc2626)', listStyle: 'disc' }}>
                    {rule.message}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="card-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
              Cancelar
            </Button>
            <Button variant="cta" onClick={handleSubmit} disabled={loading || !isValid} type="button">
              {loading ? 'A processar...' : 'Confirmar'}
            </Button>
          </div>
        </>
      )}
      {success && (
        <div className="card-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <Button variant="secondary" onClick={onClose} type="button">
            Fechar
          </Button>
        </div>
      )}
    </Modal>
  )
}
