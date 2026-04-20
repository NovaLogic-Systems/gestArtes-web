import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './auth.css'

export default function ForgotPasswordPage() {
  useEffect(() => {
    document.body.classList.add('auth-page')

    return () => {
      document.body.classList.remove('auth-page')
    }
  }, [])

  return (
    <main className="auth-shell">
      <div aria-hidden="true" className="auth-orb auth-orb-a" />
      <div aria-hidden="true" className="auth-orb auth-orb-b" />

      <section className="auth-card auth-card-login auth-card-recovery" aria-labelledby="recovery-title">
        <h1 id="recovery-title" className="auth-title auth-title-sm">
          Recuperar palavra-passe
        </h1>
        <p className="auth-copy">Funcionalidade ainda não está disponível nesta versão.</p>

        <div className="auth-status auth-status-info" role="status" aria-live="polite">
          Contacta a secretaria para reposição manual de credenciais.
        </div>

        <ul className="auth-list">
          <li>Verifica a pasta SPAM se receberes email de suporte.</li>
          <li>Depois da reposição, termina as sessões antigas e inicia sessão nova.</li>
          <li>Em caso de bloqueio de conta, pede desbloqueio à administração.</li>
        </ul>

        <p className="auth-footer-link">
          <Link to="/login">Voltar ao início de sessão</Link>
        </p>
      </section>
    </main>
  )
}
