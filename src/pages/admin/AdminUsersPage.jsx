/**
 * @file src/pages/admin/AdminUsersPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import AdminShell from './AdminShell'
import WithRole from '../../components/WithRole'
import { useAuth } from '../../hooks/useAuth'
import adminUsersService from '../../services/adminUsersService'
import { maskEmail } from '../../utils/masking'
import { ADMIN_ROLE_OPTIONS, toAppRole } from '../../utils/roles'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import ResetPasswordModal from '../../components/admin/ResetPasswordModal'
import '../admin-studios.css'

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
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Edit Modal
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState(null)

  // Reset Password Modal
  const [resetPasswordUser, setResetPasswordUser] = useState(null)

  const isFormStudent = useMemo(() => Array.isArray(form.roles) && form.roles.includes('student'), [form.roles])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const entries = await adminUsersService.listUsers()
      setUsers(Array.isArray(entries) ? entries : [])
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Não foi possível carregar os utilizadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    let result = [...users]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(u =>
        (u.firstName + ' ' + (u.lastName || '')).toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.studentNumber && u.studentNumber.toLowerCase().includes(term))
      )
    }

    if (roleFilter !== 'all') {
      result = result.filter(u => (u.roles && u.roles.includes(roleFilter)) || u.role === roleFilter)
    }

    if (statusFilter !== 'all') {
      const isStatusActive = statusFilter === 'active'
      result = result.filter(u => u.isActive === isStatusActive)
    }

    setFilteredUsers(result)
  }, [users, searchTerm, roleFilter, statusFilter])

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

    try {
      const primaryRole = Array.isArray(form.roles) ? form.roles[0] : 'student'
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        role: primaryRole, // Backend create-user uses role
        birthDate: form.birthDate || undefined,
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
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
      await loadUsers()
    } catch (requestError) {
      const apiError = requestError?.response?.data
      if (apiError?.errors && Array.isArray(apiError.errors)) {
        // Handle express-validator style errors
        const msg = apiError.errors.map(err => err.msg).join(', ')
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
      header: 'Roles',
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

  return (
    <AdminShell
      title="Gestão de Utilizadores"
      subtitle="Criação e gestão de contas, atribuição de roles e status."
      activePath={location.pathname}
      topbarEnd={<span className="pill">Admin</span>}
    >
      <section className="content-grid">
        {notice && <div className="soft-box" role="status" aria-live="polite">{notice}</div>}
        {error && <div className="soft-box error" role="alert">{error}</div>}

        <article className="panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <h3>Utilizadores registados ({filteredUsers.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
              />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
              >
                <option value="all">Todas as Roles</option>
                {ADMIN_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.35rem 0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
              >
                <option value="all">Todos os Estados</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </select>
              <button type="button" className="ghost-btn" onClick={loadUsers}>Atualizar</button>
            </div>
          </div>

          <Table
            columns={columns}
            rows={filteredUsers}
            getRowKey={(u) => u.userId}
            emptyState={loading ? 'A carregar utilizadores...' : 'Sem utilizadores encontrados.'}
            headBackground="#f8f9fa"
          />
        </article>

        <WithRole roles={['admin']}>
          <article className="panel">
            <div className="panel-header">
              <h3>Novo utilizador</h3>
            </div>
            <p>A opção <strong>Direção</strong> é guardada internamente como role de sistema <strong>admin</strong>.</p>

            <form className="form-grid two" onSubmit={handleSubmit}>
              <Input label="Nome" required value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} />
              <Input label="Apelido" value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} />
              <Input label="Email" type="email" required value={form.email} onChange={e => updateForm('email', e.target.value)} />
              <Input label="Telefone" value={form.phoneNumber} onChange={e => updateForm('phoneNumber', e.target.value)} />
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Roles</span>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {ADMIN_ROLE_OPTIONS.map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'normal' }}>
                      <input
                        type="checkbox"
                        checked={Array.isArray(form.roles) && form.roles.includes(opt.value)}
                        onChange={() => handleRoleToggle(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {isFormStudent && (
                <>
                  <Input label="Número de Aluno (Opcional)" value={form.studentNumber} onChange={e => updateForm('studentNumber', e.target.value)} placeholder="Gerado automaticamente se vazio" />
                  <Input label="Data de nascimento" type="date" required value={form.birthDate} onChange={e => updateForm('birthDate', e.target.value)} />
                  <Input label="Nome do encarregado" value={form.guardianName} onChange={e => updateForm('guardianName', e.target.value)} />
                  <Input label="Telefone do encarregado" value={form.guardianPhone} onChange={e => updateForm('guardianPhone', e.target.value)} />
                </>
              )}

              <div className="card-actions form-actions" style={{ gridColumn: '1 / -1' }}>
                <Button variant="cta" type="submit" isLoading={submitting}>
                  Criar utilizador
                </Button>
                <Button variant="ghost" type="button" onClick={() => { setForm(emptyForm); setError(''); setNotice('') }}>
                  Limpar
                </Button>
              </div>
            </form>
          </article>
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
              <Input label="Telefone" value={editForm.phoneNumber} onChange={e => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))} />

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
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {ADMIN_ROLE_OPTIONS.map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'normal' }}>
                      <input
                        type="checkbox"
                        checked={Array.isArray(editForm.roles) && editForm.roles.includes(opt.value)}
                        onChange={() => {
                          setEditForm(prev => {
                            const currentRoles = Array.isArray(prev.roles) ? prev.roles : []
                            const roles = currentRoles.includes(opt.value) ? currentRoles.filter(r => r !== opt.value) : [...currentRoles, opt.value]
                            return { ...prev, roles: roles.length ? roles : ['student'] }
                          })
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {Array.isArray(editForm.roles) && editForm.roles.includes('student') && (
                <>
                  <Input label="Número de Aluno (Opcional)" value={editForm.studentNumber} onChange={e => setEditForm(prev => ({ ...prev, studentNumber: e.target.value }))} placeholder="Gerado automaticamente se vazio" />
                  <Input label="Data de nascimento" type="date" required value={editForm.birthDate} onChange={e => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))} />
                  <Input label="Nome do encarregado" value={editForm.guardianName} onChange={e => setEditForm(prev => ({ ...prev, guardianName: e.target.value }))} />
                  <Input label="Telefone do encarregado" value={editForm.guardianPhone} onChange={e => setEditForm(prev => ({ ...prev, guardianPhone: e.target.value }))} />
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
