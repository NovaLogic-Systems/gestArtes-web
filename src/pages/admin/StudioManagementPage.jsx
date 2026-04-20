import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from '../../components/layout/Sidebar'
import Topbar from '../../components/layout/Topbar'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import '../studio-management.css'

const formatOptions = [
  { value: 'O', label: 'O' },
  { value: 'Z', label: 'Z' },
  { value: '2O', label: '2O' },
]

const modalityOptions = [
  'Ballet Clássico',
  'Contemporâneo',
  'Jazz',
  'Hip Hop',
  'Danças Urbanas',
  'Sapateado',
  'Flamenco',
  'Barra no Chão',
  'Acrobática',
]

const danceStyleOptions = [
  'Clássico',
  'Contemporâneo',
  'Urbano',
  'Latino',
  'Acrobático',
  'Performance',
  'Experimental',
]

const initialStudios = [
  {
    id: 'E2',
    name: 'Estúdio Musical',
    capacity: 12,
    format: 'O',
    modalities: ['Jazz', 'Contemporâneo', 'Barra no Chão'],
    styles: ['Contemporâneo', 'Performance'],
  },
  {
    id: 'E7',
    name: 'Estúdio Acrobática',
    capacity: 10,
    format: 'Z',
    modalities: ['Acrobática', 'Hip Hop', 'Danças Urbanas'],
    styles: ['Urbano', 'Acrobático'],
  },
  {
    id: 'E6',
    name: 'Estúdio Ballet',
    capacity: 14,
    format: '2O',
    modalities: ['Ballet Clássico', 'Flamenco', 'Sapateado'],
    styles: ['Clássico', 'Latino'],
  },
]

const emptyForm = {
  name: '',
  capacity: '',
  format: 'O',
  modalities: [],
  styles: [],
}

function createNextStudioId(studios) {
  const highestNumber = studios.reduce((currentHighest, studio) => {
    const numericValue = Number(String(studio.id).replace(/\D/g, ''))
    return Number.isFinite(numericValue) && numericValue > currentHighest ? numericValue : currentHighest
  }, 0)

  return `E${String(highestNumber + 1).padStart(2, '0')}`
}

function formatCheckboxLabel(value) {
  return value
}

function ChipList({ items }) {
  if (!items.length) {
    return <span className="studio-muted">Sem associações</span>
  }

  return (
    <div className="studio-chip-row">
      {items.map((item) => (
        <span key={item} className="studio-chip">
          {item}
        </span>
      ))}
    </div>
  )
}

function CheckboxGroup({ title, helperText, options, selectedValues, onToggle }) {
  return (
    <fieldset className="studio-fieldset">
      <legend>
        {title}
        {helperText ? <span className="studio-helper">{helperText}</span> : null}
      </legend>

      <div className="studio-checkbox-grid">
        {options.map((option) => {
          const checked = selectedValues.includes(option)

          return (
            <label key={option} className="studio-checkbox-card">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
              />
              <span>
                <strong>{formatCheckboxLabel(option)}</strong>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function StudioManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const formRef = useRef(null)

  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [studios, setStudios] = useState(initialStudios)
  const [editingStudioId, setEditingStudioId] = useState(null)
  const [activeStudio, setActiveStudio] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('Escolhe um estúdio para editar ou cria um novo abaixo.')
  const [error, setError] = useState('')

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Utilizador'
  const isEditing = editingStudioId !== null
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)')

    const updateIsMobile = () => {
      setIsMobile(mediaQuery.matches)
      if (!mediaQuery.matches) {
        setMobileOpen(false)
      }
    }

    updateIsMobile()
    mediaQuery.addEventListener?.('change', updateIsMobile)

    return () => {
      mediaQuery.removeEventListener?.('change', updateIsMobile)
    }
  }, [])

  const summaryCards = useMemo(() => {
    const totalCapacity = studios.reduce((sum, studio) => sum + Number(studio.capacity || 0), 0)
    const uniqueModalities = new Set(studios.flatMap((studio) => studio.modalities))
    const uniqueStyles = new Set(studios.flatMap((studio) => studio.styles))

    return [
      { label: 'Estúdios', value: studios.length },
      { label: 'Capacidade total', value: totalCapacity },
      { label: 'Modalidades compatíveis', value: uniqueModalities.size },
      { label: 'Estilos de dança', value: uniqueStyles.size },
    ]
  }, [studios])

  const navItems = useMemo(
    () => [
      { label: 'Painel', href: '/admin/dashboard' },
      { label: 'Estúdios', href: '/admin/studios', active: location.pathname === '/admin/studios' },
      { label: 'Validações', href: '#', disabled: true },
      { label: 'Utilizadores', href: '#', disabled: true },
      { label: 'Perdidos e Achados', href: '#', disabled: true },
      { label: 'Inventário', href: '#', disabled: true },
      { label: 'Marketplace', href: '#', disabled: true },
      { label: 'Finanças', href: '#', disabled: true },
      { label: 'Auditoria', href: '#', disabled: true },
    ],
    [location.pathname],
  )

  function resetForm(nextNotice = 'Formulario limpo. Podes criar um novo estúdio.') {
    setEditingStudioId(null)
    setForm(emptyForm)
    setError('')
    setNotice(nextNotice)
  }

  function startCreateStudio() {
    resetForm('A criar um novo estúdio.')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startEditStudio(studio) {
    setEditingStudioId(studio.id)
    setForm({
      name: studio.name,
      capacity: String(studio.capacity),
      format: studio.format,
      modalities: studio.modalities,
      styles: studio.styles,
    })
    setError('')
    setNotice(`A editar ${studio.name}.`)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function updateSelection(field, option) {
    setForm((currentForm) => {
      const selected = currentForm[field]
      const nextValues = selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option]

      return {
        ...currentForm,
        [field]: nextValues,
      }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const trimmedName = form.name.trim()
    const numericCapacity = Number(form.capacity)

    if (!trimmedName) {
      setError('Indica o nome do estúdio.')
      return
    }

    if (!Number.isFinite(numericCapacity) || numericCapacity < 1) {
      setError('A capacidade tem de ser um número maior do que zero.')
      return
    }

    const nextRecord = {
      id: editingStudioId ?? createNextStudioId(studios),
      name: trimmedName,
      capacity: numericCapacity,
      format: form.format,
      modalities: form.modalities,
      styles: form.styles,
    }

    setStudios((currentStudios) => {
      if (editingStudioId) {
        return currentStudios.map((studio) => (studio.id === editingStudioId ? nextRecord : studio))
      }

      return [nextRecord, ...currentStudios]
    })

    setError('')
    setNotice(editingStudioId ? `Estúdio ${trimmedName} atualizado com sucesso.` : `Estúdio ${trimmedName} criado com sucesso.`)
    setEditingStudioId(null)
    setForm(emptyForm)
  }

  function handleDeleteStudio(studio) {
    const shouldDelete = window.confirm(`Apagar ${studio.name}?`)

    if (!shouldDelete) {
      return
    }

    setStudios((currentStudios) => currentStudios.filter((entry) => entry.id !== studio.id))

    if (editingStudioId === studio.id) {
      resetForm('O estúdio em edição foi apagado.')
    }

    if (activeStudio?.id === studio.id) {
      setActiveStudio(null)
    }

    setNotice(`Estúdio ${studio.name} apagado.`)
  }

  function handleLogout() {
    logout()
    navigate('/login?reason=logged-out', { replace: true })
  }

  const columns = [
    { key: 'id', header: 'ID', width: '5rem' },
    { key: 'name', header: 'Nome' },
    { key: 'capacity', header: 'Capacidade', align: 'center', width: '7rem' },
    {
      key: 'format',
      header: 'Formato',
      width: '7rem',
      render: (studio) => <span className="studio-format-pill">{studio.format}</span>,
    },
    {
      key: 'modalities',
      header: 'Modalidades compatíveis',
      render: (studio) => <ChipList items={studio.modalities} />,
    },
    {
      key: 'styles',
      header: 'Estilos de dança',
      render: (studio) => <ChipList items={studio.styles} />,
    },
  ]

  return (
    <div className="studio-shell">
      <Sidebar
        brand={{ title: 'gestArtes', subtitle: 'Direção / Gestão' }}
        groups={[
          {
            label: 'Gestão',
            items: navItems.map((item) => ({
              ...item,
              active: item.active,
            })),
          },
        ]}
        footer={
          <Button variant="secondary" size="sm" block onClick={handleLogout}>
            Terminar sessão
          </Button>
        }
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onItemClick={({ item, event }) => {
          event.preventDefault()
          navigate(item.href)
          if (isMobile) {
            setMobileOpen(false)
          }
        }}
      />

      <main className="studio-main">
        <Topbar
          title="Gestão de Estúdios"
          subtitle="Configuração de capacidade, formato, modalidades compatíveis e catálogo de estilos"
          onMenuToggle={isMobile ? () => setMobileOpen((current) => !current) : undefined}
          menuLabel={mobileOpen ? 'Fechar' : 'Menu'}
          actions={[
            {
              id: 'new-studio',
              label: 'Novo estúdio',
              variant: 'cta',
              onClick: startCreateStudio,
            },
          ]}
          endContent={
            <span className="studio-topbar-badge">
              {studios.length} estúdios · {displayName}
            </span>
          }
          sticky
        />

        <section className="studio-summary-grid" aria-label="Resumo da gestão de estúdios">
          {summaryCards.map((card) => (
            <article key={card.label} className="studio-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </section>

        {notice ? <div className="studio-banner studio-banner-info">{notice}</div> : null}
        {error ? <div className="studio-banner studio-banner-error">{error}</div> : null}

        <section className="studio-layout">
          <article className="studio-card studio-table-card">
            <header className="studio-card-head">
              <div>
                <h3>Estúdios ativos</h3>
                <p>Lista com edição, remoção e detalhes rápidos para validação da compatibilidade.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={startCreateStudio}>
                Limpar formulário
              </Button>
            </header>

            <Table
              columns={columns}
              rows={studios}
              getRowKey={(studio) => studio.id}
              emptyState="Ainda não existem estúdios nesta lista."
              renderRowActions={(studio) => (
                <div className="studio-row-actions">
                  <Button variant="ghost" size="sm" onClick={() => setActiveStudio(studio)}>
                    Detalhes
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => startEditStudio(studio)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteStudio(studio)}>
                    Apagar
                  </Button>
                </div>
              )}
            />
          </article>

          <article ref={formRef} className="studio-card studio-form-card">
            <header className="studio-card-head">
              <div>
                <h3>{isEditing ? 'Editar estúdio' : 'Novo estúdio'}</h3>
                <p>
                  Formato, capacidade e compatibilidades ligadas ao catálogo de modalidades e estilos.
                </p>
              </div>
            </header>

            <form className="studio-form" onSubmit={handleSubmit}>
              <Input
                label="Nome"
                id="studio-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Estúdio Musical"
              />

              <Input
                label="Capacidade"
                id="studio-capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                placeholder="12"
              />

              <section className="studio-form-section">
                <div className="studio-section-head">
                  <h4>Formato</h4>
                  <p>O / Z / 2O</p>
                </div>
                <div className="studio-format-grid">
                  {formatOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={form.format === option.value ? 'studio-format-option is-selected' : 'studio-format-option'}
                      onClick={() => setForm((current) => ({ ...current, format: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <CheckboxGroup
                title="Modalidades compatíveis"
                helperText="Ligação direta à tabela StudioModality."
                options={modalityOptions}
                selectedValues={form.modalities}
                onToggle={(option) => updateSelection('modalities', option)}
              />

              <CheckboxGroup
                title="Estilos de dança"
                helperText="Catálogo UI para organização pedagógica da sala."
                options={danceStyleOptions}
                selectedValues={form.styles}
                onToggle={(option) => updateSelection('styles', option)}
              />

              <div className="studio-form-actions">
                <Button variant="secondary" type="button" onClick={() => resetForm()}>
                  Limpar
                </Button>
                <Button variant="cta" type="submit">
                  {isEditing ? 'Guardar alterações' : 'Guardar estúdio'}
                </Button>
              </div>
            </form>
          </article>
        </section>
      </main>

      <Modal
        open={Boolean(activeStudio)}
        size="lg"
        title={activeStudio?.name}
        description="Detalhes do estúdio e respetivas compatibilidades."
        onClose={() => setActiveStudio(null)}
        footer={
          <div className="studio-modal-actions">
            <Button variant="secondary" onClick={() => setActiveStudio(null)}>
              Fechar
            </Button>
            {activeStudio ? (
              <Button variant="cta" onClick={() => {
                setActiveStudio(null)
                startEditStudio(activeStudio)
              }}>
                Editar estúdio
              </Button>
            ) : null}
          </div>
        }
      >
        {activeStudio ? (
          <div className="studio-modal-grid">
            <div className="studio-stat-card">
              <span>ID</span>
              <strong>{activeStudio.id}</strong>
            </div>
            <div className="studio-stat-card">
              <span>Capacidade</span>
              <strong>{activeStudio.capacity}</strong>
            </div>
            <div className="studio-stat-card">
              <span>Formato</span>
              <strong>{activeStudio.format}</strong>
            </div>
            <div className="studio-stat-card">
              <span>Modalidades</span>
              <strong>{activeStudio.modalities.length}</strong>
            </div>

            <section className="studio-modal-section">
              <h4>Modalidades compatíveis</h4>
              <ChipList items={activeStudio.modalities} />
            </section>

            <section className="studio-modal-section">
              <h4>Estilos de dança</h4>
              <ChipList items={activeStudio.styles} />
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
