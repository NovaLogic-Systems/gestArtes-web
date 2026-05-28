/**
 * @file src/pages/admin/StudioManagementPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import NotificationsBell from '../../components/NotificationsBell'
import WithRole from '../../components/WithRole'
import studioManagementService from '../../services/studioManagementService'
import { uniqueNames } from '../../utils/strings'
import '../admin-studios.css'
import { ADMIN_NAV_ITEMS as navigationItems } from './adminNav'

const emptyForm = {
  name: '',
  capacity: '',
  formats: [],
  modalities: [],
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
  const [modalityObjects, setModalityObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [editingStudioId, setEditingStudioId] = useState(null)
  const [isStudioFormVisible, setIsStudioFormVisible] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [deletingModalityId, setDeletingModalityId] = useState(null)

  const formRef = useRef(null)

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
      const [options, modalitiesWithIds] = await Promise.all([
        studioManagementService.listStudioOptions(),
        studioManagementService.listModalitiesWithIds(),
      ])
      setFormatOptions(Array.isArray(options?.formats) ? options.formats : [])
      setModalityObjects(Array.isArray(modalitiesWithIds) ? modalitiesWithIds : [])
      setModalityOptions(Array.isArray(modalitiesWithIds) && modalitiesWithIds.length > 0
        ? modalitiesWithIds.map((m) => m.name)
        : Array.isArray(options?.modalities) ? options.modalities : [])
    } catch {
      setFormatOptions([])
      setModalityOptions([])
      setModalityObjects([])
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await Promise.all([
        loadStudios(),
        loadOptions(),
      ])
    })()
  }, [loadOptions, loadStudios])

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

  const handleDeleteModality = async (modality) => {
    if (deletingModalityId === modality.id) return
    const confirmed = window.confirm(`Apagar a modalidade "${modality.name}"?\n\nNota: não é possível apagar modalidades que estejam associadas a estúdios, professores ou sessões.`)
    if (!confirmed) return
    setDeletingModalityId(modality.id)
    try {
      await studioManagementService.deleteStudioOption({ type: 'modalities', id: modality.id })
      setModalityObjects((prev) => prev.filter((m) => m.id !== modality.id))
      setModalityOptions((prev) => prev.filter((n) => n !== modality.name))
      setNotice(`Modalidade "${modality.name}" removida.`)
      setError('')
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Não foi possível apagar a modalidade.'
      setError(msg)
    } finally {
      setDeletingModalityId(null)
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

          <div className="topbar-right">
            <NotificationsBell pageLink="/admin/notifications" />
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

          <article className="panel">
            <div className="panel-header">
              <h3>Modalidades</h3>
              <p style={{ margin: 0, color: 'var(--studio-muted)', fontSize: '0.85rem' }}>
                Para criar uma modalidade, usa o campo "Nova modalidade" no formulário de estúdio.
              </p>
            </div>
            {modalityObjects.length === 0 ? (
              <div className="soft-box">Sem modalidades registadas.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalityObjects.map((m) => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--studio-muted)', fontSize: '0.85rem' }}>{m.id}</td>
                        <td><strong>{m.name}</strong></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="danger-btn"
                            disabled={deletingModalityId === m.id}
                            onClick={() => handleDeleteModality(m)}
                          >
                            {deletingModalityId === m.id ? 'A apagar...' : 'Apagar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
