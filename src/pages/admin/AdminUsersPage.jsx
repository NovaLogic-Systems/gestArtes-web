/**
 * @file src/pages/admin/AdminUsersPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../services/api'
import AdminShell from './AdminShell'
import WithRole from '../../components/WithRole'
import adminUsersService from '../../services/adminUsersService'
import { maskEmail } from '../../utils/masking'
import { ADMIN_ROLE_OPTIONS, toAppRole } from '../../utils/roles'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import ResetPasswordModal from '../../components/admin/ResetPasswordModal'
import '../admin-studios.css'
import { localizeApiError } from '../../utils/apiErrors'

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  roles: ['student'],
  birthDate: '',
  guardianName: '',
  guardianPhone: '',
  studentNumber: '',
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

function safeISODate(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

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

function UserActionsDropdown({ user, onEdit, onReset }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} style={{ padding: '0.25rem 0.5rem', minWidth: 'auto', fontSize: '1.25rem', lineHeight: 1 }}>
        ⋮
      </Button>
      {open && (
        <div style={{ position: 'absolute', right: '100%', top: 0, marginRight: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.25rem', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <Button variant="ghost" size="sm" style={{ justifyContent: 'flex-start' }} onClick={() => { setOpen(false); onEdit(user); }}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" style={{ justifyContent: 'flex-start', color: 'var(--text-danger, #e53e3e)' }} onClick={() => { setOpen(false); onReset(user); }}>
            Redefinir senha
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const location = useLocation()

  const [users, setUsers] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to page 1 on new search
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  // Edit Modal
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState(null)

  // Reset Password Modal
  const [resetPasswordUser, setResetPasswordUser] = useState(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [availableModalities, setAvailableModalities] = useState([])

  const isFormStudent = useMemo(() => Array.isArray(form.roles) && form.roles.includes('student'), [form.roles])

  const loadModalities = useCallback(async () => {
    try {
      const resp = await api.get('/admin/studios/options')
      setAvailableModalities(resp.data?.modalities || [])
    } catch(err) {
      console.error(err)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await adminUsersService.listUsers({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        search: debouncedSearchTerm.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setUsers(Array.isArray(response.users) ? response.users : [])
      setTotalUsers(Number(response.total ?? 0))
    } catch (requestError) {
      setError(localizeApiError(requestError, 'Não foi possível carregar os utilizadores.'))
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, roleFilter, debouncedSearchTerm, statusFilter])

  useEffect(() => {
    document.body.classList.add('studio-page')
    return () => document.body.classList.remove('studio-page')
  }, [])

  useEffect(() => {
    if (editForm?.isModalityLocked && availableModalities.length === 0) {
      void loadModalities()
    }
  }, [editForm?.isModalityLocked, availableModalities.length, loadModalities])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, pageSize, totalUsers])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleRoleToggle(roleValue) {
    setForm((current) => {
      const currentRoles = Array.isArray(current.roles) ? current.roles : []
      const roles = currentRoles.includes(roleValue)
        ? currentRoles.filter(r => r !== roleValue)
        : [...currentRoles, roleValue]
      return { ...current, roles: roles.length ? roles : ['student'] } // Prevent empty roles
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    setNotice('')

    const password = form.password;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 8 || !hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('A palavra-passe deve ter no mínimo 8 caracteres e conter pelo menos uma letra maiúscula, uma minúscula e um número.');
      setSubmitting(false);
      return;
    }

    try {
      const primaryRole = Array.isArray(form.roles) ? form.roles[0] : 'student'
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        password: form.password,
        role: primaryRole || 'student', 
        birthDate: form.birthDate || undefined,
        guardianName: form.guardianName.trim() || undefined,
        guardianPhone: form.guardianPhone.trim() || undefined,
        studentNumber: form.studentNumber.trim() || undefined,
      }

      const createdUser = await adminUsersService.createUser(payload)

      if (Array.isArray(form.roles) && form.roles.length >= 1) {
        await adminUsersService.updateUserRoles(createdUser.userId, {
          roles: form.roles,
          studentNumber: payload.studentNumber,
          birthDate: payload.birthDate,
          guardianName: payload.guardianName,
          guardianPhone: payload.guardianPhone
        })
      }

      setNotice(`Utilizador criado com sucesso.`)
      setForm(emptyForm)
      setCreateModalOpen(false)
      await loadUsers()
    } catch (requestError) {
      const apiError = requestError?.response?.data
      
      if (apiError?.errors && Array.isArray(apiError.errors)) {
        // Handle express-validator style errors
        const msg = apiError.errors.map(err => err.msg).join(', ')
        setError(`Erro de validação: ${msg}`)
      } else if (apiError?.details && Array.isArray(apiError.details)) {
        // Handle custom validation details
        const msg = apiError.details.map(err => err.msg).join(', ')
        setError(`Erro de validação: ${msg}`)
      } else {
        setError(apiError?.error || apiError?.message || 'Não foi possível criar o utilizador.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleEditClick(u) {
    setEditUser(u)
    setEditForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phoneNumber: u.phoneNumber || '',
      isActive: u.isActive,
      roles: Array.isArray(u.roles) && u.roles.length ? u.roles : [toAppRole(u.role)],
      studentNumber: u.studentNumber || '',
      birthDate: safeISODate(u.birthDate),
      guardianName: u.guardianName || '',
      guardianPhone: u.guardianPhone || '',
      isModalityLocked: u.isModalityLocked || false,
      allowedModalities: Array.isArray(u.allowedModalities) ? u.allowedModalities : [],
    })
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editUser || submitting) return
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const isStudent = Array.isArray(editForm.roles) && editForm.roles.includes('student')

      await adminUsersService.updateUser(editUser.userId, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim().toLowerCase(),
        phoneNumber: editForm.phoneNumber.trim(),
        isActive: editForm.isActive,
        studentNumber: isStudent ? editForm.studentNumber.trim() : undefined,
        birthDate: isStudent && editForm.birthDate ? editForm.birthDate : undefined,
        guardianName: isStudent ? editForm.guardianName.trim() : undefined,
        guardianPhone: isStudent ? editForm.guardianPhone.trim() : undefined,
        isModalityLocked: isStudent ? editForm.isModalityLocked : undefined,
        allowedModalities: isStudent && editForm.isModalityLocked ? editForm.allowedModalities : undefined,
      })

      await adminUsersService.updateUserRoles(editUser.userId, {
        roles: editForm.roles,
        studentNumber: isStudent ? editForm.studentNumber.trim() : undefined,
        birthDate: isStudent && editForm.birthDate ? editForm.birthDate : undefined,
        guardianName: isStudent ? editForm.guardianName.trim() : undefined,
        guardianPhone: isStudent ? editForm.guardianPhone.trim() : undefined,
      })

      setNotice('Utilizador atualizado com sucesso.')
      setEditUser(null)
      await loadUsers()
    } catch (requestError) {
      const apiError = requestError?.response?.data
      if (apiError?.errors && Array.isArray(apiError.errors)) {
        const msg = apiError.errors.map(err => err.msg).join(', ')
        setError(`Erro de validação: ${msg}`)
      } else if (apiError?.details && Array.isArray(apiError.details)) {
        const msg = apiError.details.map(err => err.msg).join(', ')
        setError(`Erro de validação: ${msg}`)
      } else {
        setError(apiError?.error || apiError?.message || 'Não foi possível atualizar o utilizador.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'userId',
      header: 'ID',
      width: '60px',
      render: (u) => String(u.userId).padStart(3, '0')
    },
    {
      key: 'name',
      header: 'Nome',
      render: (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'
    },
    {
      key: 'email',
      header: 'Email',
      render: (u) => maskEmail(u.email) || '—'
    },
    {
      key: 'studentNumber',
      header: 'Nº Aluno',
      render: (u) => {
        if (!u.studentNumber) return '—'
        // If it's a student account with format ST-1234, just extract the number
        const match = u.studentNumber.match(/\d+/)
        return match ? match[0] : u.studentNumber
      }
    },
    {
      key: 'roles',
      header: 'Perfil',
      render: (u) => (
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {(Array.isArray(u.roles) && u.roles.length ? u.roles : [u.role]).map(r => {
            const roleVal = toAppRole(r)
            const option = ADMIN_ROLE_OPTIONS.find(opt => opt.value === roleVal)
            return (
              <Badge key={r} variant="neutral" size="sm">
                {option?.label || r || '—'}
              </Badge>
            )
          })}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => (
        <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
          {u.isActive ? 'Ativo' : 'Suspenso'}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (u) => formatDate(u.createdAt)
    },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <UserActionsDropdown 
          user={u} 
          onEdit={handleEditClick} 
          onReset={setResetPasswordUser} 
        />
      )
    }
  ]

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize))
  const firstItem = totalUsers === 0 ? 0 : ((currentPage - 1) * pageSize) + 1
  const lastItem = Math.min(totalUsers, currentPage * pageSize)

  return (
    <AdminShell
      title="Gestão de Utilizadores"
      subtitle="Criação e gestão de contas, atribuição de perfis e status."
      activePath={location.pathname}
    >
      <section className="content-grid">
        {notice && <div className="soft-box" role="status" aria-live="polite">{notice}</div>}
        {error && <div className="soft-box error" role="alert">{error}</div>}

        <article className="panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Utilizadores registados ({totalUsers})</h3>
            <br />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={e => { setCurrentPage(1); setSearchTerm(e.target.value) }}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
              />
              <select
                value={roleFilter}
                onChange={e => { setCurrentPage(1); setRoleFilter(e.target.value) }}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
              >
                <option value="all">Todos os Perfis</option>
                {ADMIN_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => { setCurrentPage(1); setStatusFilter(e.target.value) }}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
              >
                <option value="all">Todos os Estados</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </select>
              <button type="button" className="ghost-btn" onClick={loadUsers}>Atualizar</button>
              <WithRole roles={['admin']}>
                <Button variant="cta" onClick={() => { setForm(emptyForm); setError(''); setNotice(''); setCreateModalOpen(true); }}>Criar utilizador</Button>
              </WithRole>
            </div>
          </div>

          <Table
            columns={columns}
            rows={users}
            getRowKey={(u) => u.userId}
            emptyState={loading ? 'A carregar utilizadores...' : 'Sem utilizadores encontrados.'}
            headBackground="#f8f9fa"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--text-muted, #718096)', fontSize: '0.9rem' }}>
              {totalUsers === 0 ? 'Sem utilizadores para mostrar.' : `A mostrar ${firstItem}-${lastItem} de ${totalUsers}`}
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              ariaLabel="Paginação de utilizadores"
              style={{ marginTop: 0 }}
            />
          </div>
        </article>

        <WithRole roles={['admin']}>
          {createModalOpen && (
            <Modal
              open={true}
              onClose={() => setCreateModalOpen(false)}
              title="Novo utilizador"
              size="md"
            >
              <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>A opção <strong>Direção</strong> é guardada internamente como role de sistema <strong>admin</strong>.</p>
              {error && <div className="soft-box error" style={{ marginBottom: '1rem' }} role="alert">{error}</div>}
              
              <form className="form-grid two" onSubmit={handleSubmit}>
                <Input label="Nome" required value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} />
                <Input label="Apelido" value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} />
                <Input label="Email" type="email" required value={form.email} onChange={e => updateForm('email', e.target.value)} />
                <Input
                  label="Telefone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="912345678" 
                  value={form.phoneNumber}
                  onChange={e => updateForm('phoneNumber', e.target.value.replace(/[^\d+\s]/g, ''))}
                  maxLength={9}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <Input 
                    label="Palavra-passe" 
                    type={showNewPassword ? 'text' : 'password'} 
                    required 
                    minLength={8} 
                    value={form.password} 
                    onChange={e => updateForm('password', e.target.value)} 
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0, display: 'flex' }}
                        title={showNewPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    }
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #718096)', marginTop: '-0.25rem' }}>
                    Mín. 8 caracteres, com maiúscula, minúscula e número.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Roles</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ADMIN_ROLE_OPTIONS.map(opt => {
                    const isSelected = Array.isArray(form.roles) && form.roles.includes(opt.value);
                    return (
                      <label 
                        key={opt.value} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '999px',
                          border: `1px solid ${isSelected ? 'var(--teal, #0b9d8f)' : 'var(--line, #e2d9eb)'}`,
                          background: isSelected ? 'var(--teal, #0b9d8f)' : '#fff',
                          color: isSelected ? '#fff' : 'var(--muted, #6d6480)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRoleToggle(opt.value)}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
                </div>

                {isFormStudent && (
                  <>
                    <Input label="Número de Aluno (Opcional)" value={form.studentNumber} onChange={e => updateForm('studentNumber', e.target.value)} placeholder="Gerado automaticamente se vazio" />
                    <Input label="Data de nascimento" type="date" required value={form.birthDate} onChange={e => updateForm('birthDate', e.target.value)} />
                    <Input label="Nome do EE" value={form.guardianName} onChange={e => updateForm('guardianName', e.target.value)} />
                    <Input label="Telefone do EE" value={form.guardianPhone} onChange={e => updateForm('guardianPhone', e.target.value)} />
                  </>
                )}

                <div className="card-actions form-actions" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                  <Button variant="cta" type="submit" isLoading={submitting}>
                    Criar utilizador
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </WithRole>

        {resetPasswordUser && (
          <ResetPasswordModal
            userId={resetPasswordUser.userId}
            userName={[resetPasswordUser.firstName, resetPasswordUser.lastName].filter(Boolean).join(' ')}
            onClose={() => setResetPasswordUser(null)}
          />
        )}

        {editUser && editForm && (
          <Modal
            open={true}
            onClose={() => setEditUser(null)}
            title="Editar Utilizador"
            size="md"
          >
            {error && <div className="soft-box error" style={{ marginBottom: '1rem' }} role="alert">{error}</div>}
            {notice && <div className="soft-box" style={{ marginBottom: '1rem' }} role="status">{notice}</div>}

            <form onSubmit={handleEditSubmit} className="form-grid two">
              <Input label="Nome" required value={editForm.firstName} onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))} />
              <Input label="Apelido" value={editForm.lastName} onChange={e => setEditForm(prev => ({ ...prev, lastName: e.target.value }))} />
              <Input label="Email" type="email" required value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
              <Input
                label="Telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="912345678"
                value={editForm.phoneNumber}
                onChange={e => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value.replace(/[^\d+\s]/g, '') }))}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ color: 'var(--text-h)', fontSize: '0.95rem', fontWeight: 600 }}>Estado</span>
                <select
                  value={editForm.isActive ? 'active' : 'suspended'}
                  onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.value === 'active' }))}
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.875rem',
                    padding: '0.75rem 0.9rem', color: 'var(--text-h)', font: 'inherit', outline: 'none', width: '100%'
                  }}
                >
                  <option value="active">Ativo</option>
                  <option value="suspended">Suspenso</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Roles</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ADMIN_ROLE_OPTIONS.map(opt => {
                    const isSelected = Array.isArray(editForm.roles) && editForm.roles.includes(opt.value);
                    return (
                      <label 
                        key={opt.value} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '999px',
                          border: `1px solid ${isSelected ? 'var(--teal, #0b9d8f)' : 'var(--line, #e2d9eb)'}`,
                          background: isSelected ? 'var(--teal, #0b9d8f)' : '#fff',
                          color: isSelected ? '#fff' : 'var(--muted, #6d6480)',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setEditForm(prev => {
                              const currentRoles = Array.isArray(prev.roles) ? prev.roles : []
                              const roles = currentRoles.includes(opt.value) ? currentRoles.filter(r => r !== opt.value) : [...currentRoles, opt.value]
                              return { ...prev, roles: roles.length ? roles : ['student'] }
                            })
                          }}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
              </div>

              {Array.isArray(editForm.roles) && editForm.roles.includes('student') && (
                <>
                  <Input label="Número de Aluno (Opcional)" value={editForm.studentNumber} onChange={e => setEditForm(prev => ({ ...prev, studentNumber: e.target.value }))} placeholder="Gerado automaticamente se vazio" />
                  <Input label="Data de nascimento" type="date" required value={editForm.birthDate} onChange={e => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))} />
                  <Input label="Nome do EE" value={editForm.guardianName} onChange={e => setEditForm(prev => ({ ...prev, guardianName: e.target.value }))} />
                  <Input label="Telefone do EE" value={editForm.guardianPhone} onChange={e => setEditForm(prev => ({ ...prev, guardianPhone: e.target.value }))} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={editForm.isModalityLocked || false}
                        onChange={e => setEditForm(prev => ({ ...prev, isModalityLocked: e.target.checked }))}
                      />
                      Bloquear aluno a modalidades específicas
                    </label>
                  </div>

                  {editForm.isModalityLocked && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Modalidades Permitidas</span>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: 'var(--bg)', padding: '1rem', borderRadius: '0.875rem', border: '1px solid var(--border)' }}>
                        {availableModalities.map(mod => (
                          <label key={mod.modalityId} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'normal' }}>
                            <input
                              type="checkbox"
                              checked={Array.isArray(editForm.allowedModalities) && editForm.allowedModalities.includes(mod.modalityId)}
                              onChange={() => {
                                setEditForm(prev => {
                                  const c = Array.isArray(prev.allowedModalities) ? prev.allowedModalities : []
                                  return { 
                                    ...prev, 
                                    allowedModalities: c.includes(mod.modalityId) ? c.filter(id => id !== mod.modalityId) : [...c, mod.modalityId]
                                  }
                                })
                              }}
                            />
                            {mod.modalityName}
                          </label>
                        ))}
                        {availableModalities.length === 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-h)' }}>Nenhuma modalidade encontrada.</span>}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="card-actions form-actions" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <Button variant="cta" type="submit" isLoading={submitting}>
                  Guardar Alterações
                </Button>
                <Button variant="ghost" type="button" onClick={() => setEditUser(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>
        )}

      </section>
    </AdminShell>
  )
}
