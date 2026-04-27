import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import WithRole from '../../components/WithRole'
import notificationPreviewService from '../../services/notificationPreviewService'
import studioManagementService from '../../services/studioManagementService'
import { uniqueNames } from '../../utils/strings'
import '../admin-studios.css'

const navigationItems = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/validations', label: 'Validações' },
  { href: '/admin/studios', label: 'Estúdios' },
  { href: '/admin/users', label: 'Utilizadores' },
  { href: '/admin/lostfound', label: 'Perdidos e Achados' },
  { href: '/admin/inventory', label: 'Inventário da Escola' },
  { href: '/admin/marketplace', label: 'Marketplace' },
  { href: '/admin/finance', label: 'Finanças' },
  { href: '/admin/audit', label: 'Auditoria' },
]

const emptyForm = {
  name: '',
  capacity: '',
  formats: [],
  modalities: [],
}

function formatNotificationDate(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function MultiSelectDropdown({
  id,
  label,
  placeholder,
  options,
  selectedValues,
  onToggle,
  onCreate,
  createPlaceholder,
}) {
  const [open, setOpen] = useState(false)
  const [newOptionName, setNewOptionName] = useState('')
  const [creatingOption, setCreatingOption] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const summary = selectedValues.length
    ? selectedValues.join(', ')
    : placeholder

  const handleCreate = async () => {
    const candidate = newOptionName.trim()
    if (!candidate || creatingOption) {
      return
    }

    setCreatingOption(true)

    try {
      await onCreate(candidate)
      setNewOptionName('')
    } finally {
      setCreatingOption(false)
    }
  }

  return (
    <div className="multi-select-field" ref={rootRef}>
      <span className="multi-select-label">{label}</span>

      <button
        type="button"
        id={id}
        className={`multi-select-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen((currentValue) => !currentValue)}
        aria-expanded={open}
        aria-controls={`${id}-menu`}
      >
        <span>{summary}</span>
        <span className="multi-select-caret" aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="multi-select-menu" id={`${id}-menu`}>
          <div className="multi-select-options">
            {options.length ? (
              options.map((option) => {
                const checked = selectedValues.includes(option)

                return (
                  <label key={option} className="multi-select-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(option)}
                    />
                    <span>{option}</span>
                  </label>
                )
              })
            ) : (
              <p className="multi-select-empty">Sem opções carregadas do backend.</p>
            )}
          </div>

          <div className="multi-select-create">
            <input
              type="text"
              value={newOptionName}
              onChange={(event) => setNewOptionName(event.target.value)}
              placeholder={createPlaceholder}
              autoComplete="off"
            />
            <button
              type="button"
              className="icon-btn"
              onClick={handleCreate}
              aria-label={`Adicionar opção em ${label}`}
              disabled={creatingOption}
            >
              +
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StudioManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [studios, setStudios] = useState([])
  const [formatOptions, setFormatOptions] = useState([])
  const [modalityOptions, setModalityOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [editingStudioId, setEditingStudioId] = useState(null)
  const [isStudioFormVisible, setIsStudioFormVisible] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)

  const formRef = useRef(null)
  const notificationBoxRef = useRef(null)

  const displayName = user?.fullName || user?.name || user?.email || 'Utilizador'

  const currentEditingStudio = useMemo(() => {
    if (!editingStudioId) {
      return null
    }

    return studios.find((studio) => String(studio.id) === String(editingStudioId)) ?? null
  }, [editingStudioId, studios])

  const sidebarActivePath = location.pathname
  const sidebarHidden = isMobile || sidebarCollapsed
  const appShellClassName = ['app-shell', sidebarHidden ? 'sidebar-hidden' : '']
    .filter(Boolean)
    .join(' ')

  const sidebarClassName = ['sidebar', isMobile && mobileOpen ? 'open' : '']
    .filter(Boolean)
    .join(' ')

  const sidebarToggleSymbol = isMobile
    ? mobileOpen ? '✕' : '☰'
    : sidebarCollapsed ? '▶' : '◀'

  const sidebarToggleLabel = isMobile
    ? mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'
    : sidebarCollapsed ? 'Mostrar barra lateral' : 'Esconder barra lateral'

  const loadStudios = useCallback(async () => {
    setLoading(true)
    setLoadingError('')

    try {
      const payload = await studioManagementService.listStudios()
      setStudios(Array.isArray(payload) ? payload : [])
    } catch {
      setLoadingError('Não foi possível carregar os estúdios.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOptions = useCallback(async () => {
    try {
      const options = await studioManagementService.listStudioOptions()
      setFormatOptions(Array.isArray(options?.formats) ? options.formats : [])
      setModalityOptions(Array.isArray(options?.modalities) ? options.modalities : [])
    } catch {
      setFormatOptions([])
      setModalityOptions([])
    }
  }, [])

  const refreshNotificationSummary = useCallback(async () => {
    const preview = await notificationPreviewService.getPreview({ limit: 0, includeUnreadCount: true })
    setNotificationUnreadCount(preview.unreadCount)
  }, [])

  const loadNotificationPreview = useCallback(async () => {
    setNotificationsLoading(true)
    setNotificationsError('')

    try {
      const preview = await notificationPreviewService.getPreview({ limit: 4, includeUnreadCount: true })
      setNotifications(preview.items)
      setNotificationUnreadCount(preview.unreadCount)
      setNotificationsLoaded(true)
    } catch {
      setNotificationsError('Não foi possível carregar as notificações.')
    } finally {
      setNotificationsLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await Promise.all([
        loadStudios(),
        loadOptions(),
        refreshNotificationSummary(),
      ])
    })()
  }, [loadOptions, loadStudios, refreshNotificationSummary])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)')

    const updateLayout = () => {
      setIsMobile(mediaQuery.matches)

      if (!mediaQuery.matches) {
        setMobileOpen(false)
      }
    }

    updateLayout()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateLayout)
      return () => mediaQuery.removeEventListener('change', updateLayout)
    }

    mediaQuery.addListener(updateLayout)
    return () => mediaQuery.removeListener(updateLayout)
  }, [])

  useEffect(() => {
    document.body.classList.add('studio-page')

    return () => {
      document.body.classList.remove('studio-page')
    }
  }, [])

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (notificationBoxRef.current && !notificationBoxRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notificationsOpen])

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileOpen((currentValue) => !currentValue)
      return
    }

    setSidebarCollapsed((currentValue) => !currentValue)
  }

  const handleMobileNavClick = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const resetForm = () => {
    setEditingStudioId(null)
    setForm(emptyForm)
    setError('')
  }

  const startCreateStudio = () => {
    resetForm()
    setIsStudioFormVisible(true)
    setNotice('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const startEditStudio = (studio) => {
    setEditingStudioId(studio.id)
    setIsStudioFormVisible(true)
    setForm({
      name: studio.name,
      capacity: String(studio.capacity),
      formats: uniqueNames(studio.formats || []),
      modalities: uniqueNames(studio.modalities || []),
    })
    setError('')
    setNotice(`A editar ${studio.name}.`)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleFormSelection = (field, value) => {
    setForm((current) => {
      const currentValues = Array.isArray(current[field]) ? current[field] : []

      if (currentValues.includes(value)) {
        return {
          ...current,
          [field]: currentValues.filter((item) => item !== value),
        }
      }

      return {
        ...current,
        [field]: uniqueNames([...currentValues, value]),
      }
    })
  }

  const handleCreateOption = async (field, value) => {
    const type = field === 'formats' ? 'formats' : 'modalities'

    try {
      const createdName = await studioManagementService.createStudioOption({ type, name: value })

      if (field === 'formats') {
        setFormatOptions((current) => uniqueNames([...current, createdName]))
      } else {
        setModalityOptions((current) => uniqueNames([...current, createdName]))
      }

      toggleFormSelection(field, createdName)
      setError('')
      setNotice(`Opção "${createdName}" adicionada.`)
    } catch (requestError) {
      const message = requestError?.message || 'Não foi possível criar a opção.'
      setError(message)
    }
  }

  const handleDeleteStudio = async (studio) => {
    const confirmed = window.confirm(`Apagar o estúdio ${studio.name}?`)

    if (!confirmed) {
      return
    }

    try {
      await studioManagementService.deleteStudio(studio.id)
      await Promise.all([loadStudios(), loadOptions()])
      setNotice(`Estúdio ${studio.name} removido com sucesso.`)
      setError('')

      if (String(editingStudioId) === String(studio.id)) {
        resetForm()
        setIsStudioFormVisible(false)
      }
    } catch {
      setError('Não foi possível apagar o estúdio.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const studioName = form.name.trim()
    const capacity = Number(form.capacity)
    const formats = uniqueNames(form.formats)
    const modalities = uniqueNames(form.modalities)

    if (!studioName) {
      setError('Indica o nome do estúdio.')
      return
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('Indica uma capacidade válida.')
      return
    }

    const payload = {
      studioName,
      capacity,
      formats,
      modalities,
      modalityNames: modalities,
    }

    const isEditing = Boolean(editingStudioId)

    try {
      if (isEditing) {
        await studioManagementService.updateStudio(editingStudioId, payload)
      } else {
        await studioManagementService.createStudio(payload)
      }

      await Promise.all([loadStudios(), loadOptions()])
      setError('')
      setNotice(
        isEditing
          ? `Estúdio ${studioName} atualizado com sucesso.`
          : `Estúdio ${studioName} criado com sucesso.`,
      )
      resetForm()
      setIsStudioFormVisible(false)
    } catch {
      setError('Não foi possível guardar o estúdio.')
    }
  }

  const handleNotificationsClick = () => {
    const nextState = !notificationsOpen
    setNotificationsOpen(nextState)

    if (nextState && !notificationsLoaded) {
      void loadNotificationPreview()
    }
  }

  const handleLogout = async (event) => {
    event.preventDefault()

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className={appShellClassName}>
      {isMobile && mobileOpen ? (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fechar navegação lateral"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside className={sidebarClassName} id="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>gestArtes</h1>
            <p>{displayName}</p>
          </div>
        </div>

        <div className="nav-group">
          <h2>Gestão</h2>

          {navigationItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${sidebarActivePath === item.href ? ' active' : ''}`}
              to={item.href}
              onClick={handleMobileNavClick}
            >
              {item.label}
            </Link>
          ))}

          <a className="nav-link" href="/login" title={`Terminar sessão de ${displayName}`} onClick={handleLogout}>
            Terminar Sessão
          </a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-heading">
              <button
                type="button"
                className="sidebar-toggle-btn"
                aria-label={sidebarToggleLabel}
                onClick={handleSidebarToggle}
              >
                {sidebarToggleSymbol}
              </button>
              <h2>Gestão de Estúdios</h2>
            </div>
            <p>Configuração de capacidade, formatos, modalidades e ocupação</p>
          </div>

          <div className="topbar-right" ref={notificationBoxRef}>
            <button type="button" className="pill notifications-pill" onClick={handleNotificationsClick}>
              Notificações {notificationUnreadCount}
            </button>

            {notificationsOpen ? (
              <div className="notifications-popover">
                <div className="notifications-popover-header">
                  <strong>Notificações</strong>
                </div>

                {notificationsLoading ? (
                  <p className="notifications-state">A carregar...</p>
                ) : null}

                {!notificationsLoading && notificationsError ? (
                  <p className="notifications-state error">{notificationsError}</p>
                ) : null}

                {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                  <p className="notifications-state">Sem notificações.</p>
                ) : null}

                {!notificationsLoading && notifications.length > 0 ? (
                  <ul className="notifications-list">
                    {notifications.map((notification) => (
                      <li key={notification.id} className="notifications-item">
                        <strong>{notification.title}</strong>
                        {notification.message ? <p>{notification.message}</p> : null}
                        <small>{formatNotificationDate(notification.createdAt)}</small>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Link
                  to="/notifications"
                  className="notifications-more-link"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Ver Mais
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <section className="content-grid">
          {notice ? (
            <div className="soft-box" role="status" aria-live="polite">
              {notice}
            </div>
          ) : null}

          {loadingError ? (
            <div className="soft-box error" role="alert">
              {loadingError}
            </div>
          ) : null}

          {error ? (
            <div className="soft-box error" role="alert">
              {error}
            </div>
          ) : null}

          <article className="panel studios-panel">
            <div className="panel-header">
              <h3>Estúdios ativos</h3>
              <button type="button" className="ghost-btn" onClick={startCreateStudio}>
                Novo estúdio
              </button>
            </div>

            {loading ? (
              <div className="soft-box">A carregar estúdios...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Capacidade</th>
                      <th>Formatos</th>
                      <th>Modalidades</th>
                      <th>Ação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studios.length ? (
                      studios.map((studio) => (
                        <tr key={studio.id}>
                          <td>{studio.id}</td>
                          <td>{studio.name}</td>
                          <td>{studio.capacity}</td>
                          <td>{studio.formatsText || 'Sem formatos definidos'}</td>
                          <td>{studio.modalitiesText || 'Sem modalidades definidas'}</td>
                          <td>
                            <div className="card-actions">
                              <button type="button" className="ghost-btn" onClick={() => startEditStudio(studio)}>
                                Editar
                              </button>
                              <WithRole roles={['admin']}>
                                <button type="button" className="danger-btn" onClick={() => handleDeleteStudio(studio)}>
                                  Apagar
                                </button>
                              </WithRole>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>Sem dados de estúdios do backend.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="quick-actions">
              <Link className="cta secondary" to="/admin/studio-occupancy">
                Abrir gestão detalhada de ocupação
              </Link>
            </div>
          </article>

          {isStudioFormVisible ? (
            <article ref={formRef} className="panel">
              <div className="panel-header">
                <h3 style={{ margin: 0 }}>{editingStudioId ? 'Editar estúdio' : 'Novo estúdio'}</h3>
                <div className="card-actions">
                  {editingStudioId ? (
                    <Link className="danger-btn" to={`/admin/studio-occupancy?studioId=${encodeURIComponent(editingStudioId)}`}>
                      Bloquear
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setIsStudioFormVisible(false)
                      resetForm()
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <p>
                {editingStudioId && currentEditingStudio
                  ? `A editar ${currentEditingStudio.name}.`
                  : 'Cria um novo estúdio com opções vindas da base de dados.'}
              </p>

              <form className="form-grid two" onSubmit={handleSubmit}>
                <label>
                  Nome
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    autoComplete="off"
                  />
                </label>

                <label>
                  Capacidade
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                  />
                </label>

                <MultiSelectDropdown
                  id="studio-formats"
                  label="Formatos compatíveis"
                  placeholder="Selecionar formatos"
                  options={formatOptions}
                  selectedValues={form.formats}
                  onToggle={(value) => toggleFormSelection('formats', value)}
                  onCreate={(value) => handleCreateOption('formats', value)}
                  createPlaceholder="Novo formato"
                />

                <MultiSelectDropdown
                  id="studio-modalities"
                  label="Modalidades compatíveis"
                  placeholder="Selecionar modalidades"
                  options={modalityOptions}
                  selectedValues={form.modalities}
                  onToggle={(value) => toggleFormSelection('modalities', value)}
                  onCreate={(value) => handleCreateOption('modalities', value)}
                  createPlaceholder="Nova modalidade"
                />

                <div className="card-actions form-actions">
                  <button className="cta" type="submit">
                    {editingStudioId ? 'Guardar alterações' : 'Guardar estúdio'}
                  </button>
                  <button className="ghost-btn" type="button" onClick={resetForm}>
                    Limpar
                  </button>
                </div>
              </form>
            </article>
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default StudioManagementPage
