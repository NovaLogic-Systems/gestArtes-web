/**
 * @file src/pages/ForgotPasswordPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

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

      <section className="auth-card auth-card-recovery" aria-labelledby="recovery-title">
        <h1 id="recovery-title" className="auth-title-sm">
          Recuperar palavra-passe
        </h1>

        <p className="auth-copy">
          A recuperação de palavra-passe é tratada pela equipa administrativa da escola.
          Contacta a secretaria para repor o acesso à tua conta.
        </p>

        <p className="auth-footer-link" style={{ marginBottom: 0 }}>
          <Link to="/login">Voltar para login</Link>
        </p>
      </section>
    </main>
  )
}