import { useEffect, useMemo, useState } from 'react'
import MarketplaceImage from './MarketplaceImage'
import { resolveMarketplacePhotoUrl } from '../utils/marketplace-photo-url'
import Badge from './ui/Badge'

const DEFAULT_VALUES = {
  title: '',
  description: '',
  price: '',
  categoryId: '',
  conditionId: '',
  location: '',
}

function normalizeValues(source = {}) {
  return {
    ...DEFAULT_VALUES,
    ...source,
    price: source?.price ?? '',
    categoryId: source?.categoryId ?? source?.category?.categoryId ?? '',
    conditionId: source?.conditionId ?? source?.condition?.conditionId ?? '',
  }
}

function resolveStatusVariant(statusName) {
  const normalized = String(statusName || '').trim().toLowerCase()

  if (!normalized) {
    return 'neutral'
  }

  if (normalized.includes('reject') || normalized.includes('rejeit')) {
    return 'danger'
  }

  if (normalized.includes('pending') || normalized.includes('pend')) {
    return 'warning'
  }

  if (normalized.includes('active') || normalized.includes('approved') || normalized.includes('published')) {
    return 'success'
  }

  return 'neutral'
}

function resolveStatusLabel(statusName) {
  const normalized = String(statusName || '').trim()

  if (!normalized) {
    return ''
  }

  if (/pending|pend/i.test(normalized)) {
    return 'Pendente de moderação'
  }

  if (/reject|rejeit/i.test(normalized)) {
    return 'Rejeitado'
  }

  if (/active|approved|published|publicad|aprov/i.test(normalized)) {
    return 'Ativo'
  }

  if (/remov|hidden|inactive|inativ/i.test(normalized)) {
    return 'Inativo'
  }

  return 'Estado desconhecido'
}

export default function ListingForm({
  initialValues,
  categories = [],
  conditions = [],
  allowNewCategory = false,
  submitLabel,
  busy = false,
  onSubmit,
  onCancel,
}) {
  const [values, setValues] = useState(() => normalizeValues(initialValues))
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')

  const previewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile)
    }

    return resolveMarketplacePhotoUrl(initialValues?.photoUrl)
  }, [initialValues?.photoUrl, selectedFile])

  useEffect(() => {
    if (!selectedFile || !previewUrl.startsWith('blob:')) {
      return undefined
    }

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl, selectedFile])

  const submitDisabled = useMemo(() => {
    return busy || !String(values.title || '').trim() || !String(values.price || '').trim() || !values.conditionId
  }, [busy, values.conditionId, values.price, values.title])

  const formattedPrice = useMemo(() => {
    const numeric = Number(values.price)

    if (Number.isNaN(numeric) || values.price === '') {
      return '0,00 EUR'
    }

    return new Intl.NumberFormat('pt-PT', {
      currency: 'EUR',
      style: 'currency',
    }).format(numeric)
  }, [values.price])

  const selectedCategoryLabel = useMemo(() => {
    return categories.find((category) => String(category.categoryId) === String(values.categoryId))?.categoryName || 'Categoria'
  }, [categories, values.categoryId])

  const selectedConditionLabel = useMemo(() => {
    return conditions.find((condition) => String(condition.conditionId) === String(values.conditionId))?.conditionName || 'Estado'
  }, [conditions, values.conditionId])

  const currentStatusLabel = useMemo(() => {
    return resolveStatusLabel(initialValues?.status?.statusName || initialValues?.status)
  }, [initialValues?.status])

  const currentStatusVariant = useMemo(() => {
    return resolveStatusVariant(initialValues?.status?.statusName || initialValues?.status)
  }, [initialValues?.status])

  function handleChange(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    try {
      await onSubmit?.(
        {
          ...values,
          price: values.price === '' ? '' : Number(values.price),
          categoryId: values.categoryId === '__new__' || values.categoryId === '' ? '' : Number(values.categoryId),
          categoryName: values.categoryId === '__new__' ? newCategoryName.trim() : '',
          conditionId: values.conditionId === '' ? '' : Number(values.conditionId),
        },
        selectedFile,
      )
    } catch (submitError) {
      setError(submitError?.message || 'Não foi possível guardar o anúncio.')
    }
  }

  return (
    <div className="market-form-layout">
      <form className="market-form" onSubmit={handleSubmit}>
        {currentStatusLabel ? (
          <div className="market-form-full market-form-status-box">
            <div>
              <span className="market-form-label">Estado atual</span>
              <Badge variant={currentStatusVariant} size="sm">
                {currentStatusLabel}
              </Badge>
            </div>
            {initialValues?.rejectionReason ? (
              <p className="market-form-status-note">Motivo da rejeição: {initialValues.rejectionReason}</p>
            ) : null}
          </div>
        ) : null}

        <label className="market-form-full">
          <span>Título</span>
          <input
            value={values.title}
            onChange={(event) => handleChange('title', event.target.value)}
            maxLength={100}
            required
          />
        </label>

        <label>
          <span>Categoria</span>
          <select value={values.categoryId} onChange={(event) => handleChange('categoryId', event.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.categoryName}
              </option>
            ))}
            {allowNewCategory ? <option value="__new__">+ Nova categoria...</option> : null}
          </select>
          {allowNewCategory && values.categoryId === '__new__' ? (
            <input
              type="text"
              placeholder="Nome da nova categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              maxLength={50}
              required
              style={{ marginTop: '0.4rem' }}
            />
          ) : null}
        </label>

        <label>
          <span>Preco</span>
          <input
            type="number"
            value={values.price}
            min="0"
            step="0.01"
            onChange={(event) => handleChange('price', event.target.value)}
            required
          />
        </label>

        <label>
          <span>Estado do artigo</span>
          <select value={values.conditionId} onChange={(event) => handleChange('conditionId', event.target.value)} required>
            <option value="">Selecionar</option>
            {conditions.map((condition) => (
              <option key={condition.conditionId} value={condition.conditionId}>
                {condition.conditionName}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Localizacao</span>
          <input
            value={values.location}
            maxLength={100}
            onChange={(event) => handleChange('location', event.target.value)}
          />
        </label>

        <label className="market-form-full">
          <span>Descricao</span>
          <textarea
            rows={4}
            maxLength={500}
            value={values.description}
            onChange={(event) => handleChange('description', event.target.value)}
          />
        </label>

        <label className="market-form-full">
          <span>Imagem</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
        </label>

        {error ? <p className="market-form-error">{error}</p> : null}

        <div className="market-form-actions">
          <button type="button" className="market-btn market-btn-secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="market-btn" disabled={submitDisabled}>
            {busy ? 'A guardar...' : submitLabel}
          </button>
        </div>
      </form>

      <aside className="market-form-preview-panel">
        <h3>Pre-visualizacao</h3>
        <article className="market-listing-card market-form-preview-card">
          <div className="market-listing-image market-form-preview-image">
            {previewUrl ? <MarketplaceImage src={previewUrl} alt="Pre-visualizacao do anuncio" fallback={<span>Imagem do anuncio</span>} /> : <span>Imagem do anuncio</span>}
          </div>
          <div className="market-listing-content">
            <p className="market-listing-title">{values.title || 'Titulo do anuncio'}</p>
            <p className="market-listing-price">{formattedPrice}</p>
            <p className="market-listing-meta">
              {selectedCategoryLabel} · {selectedConditionLabel}
            </p>
            <p className="market-listing-meta">{values.location || 'Localizacao por definir'}</p>
          </div>
        </article>
      </aside>
    </div>
  )
}
