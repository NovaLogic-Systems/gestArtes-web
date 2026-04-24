import { useEffect, useMemo, useReducer } from 'react'

const DEFAULT_VALUES = {
  title: '',
  description: '',
  price: '',
  categoryId: '',
  conditionId: '',
  location: '',
}

const INITIAL_STATE = {
  values: DEFAULT_VALUES,
  selectedFile: null,
  previewUrl: '',
  error: '',
}

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FORM_STATE':
      return {
        ...state,
        values: action.payload.values,
        previewUrl: action.payload.previewUrl,
        selectedFile: action.payload.selectedFile,
        error: action.payload.error,
      }
    case 'SET_VALUES':
      return { ...state, values: action.payload }
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload }
    case 'SET_PREVIEW_URL':
      return { ...state, previewUrl: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'RESET_ERROR':
      return { ...state, error: '' }
    default:
      return state
  }
}

export default function ListingForm({
  initialValues,
  categories = [],
  conditions = [],
  submitLabel,
  busy = false,
  onSubmit,
  onCancel,
}) {
  const [formState, dispatch] = useReducer(formReducer, INITIAL_STATE)
  const { values, selectedFile, previewUrl, error } = formState

  useEffect(() => {
    dispatch({
      type: 'SET_FORM_STATE',
      payload: {
        values: {
          ...DEFAULT_VALUES,
          ...initialValues,
          price: initialValues?.price ?? '',
          categoryId: initialValues?.categoryId ?? initialValues?.category?.categoryId ?? '',
          conditionId: initialValues?.conditionId ?? initialValues?.condition?.conditionId ?? '',
        },
        previewUrl: initialValues?.photoUrl || '',
        selectedFile: null,
        error: '',
      },
    })
  }, [initialValues])

  useEffect(() => {
    if (!selectedFile) {
      return undefined
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    dispatch({ type: 'SET_PREVIEW_URL', payload: objectUrl })

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

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

  function handleChange(field, value) {
    dispatch({
      type: 'SET_VALUES',
      payload: {
        ...values,
        [field]: value,
      },
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    dispatch({ type: 'RESET_ERROR' })

    try {
      await onSubmit?.(
        {
          ...values,
          price: values.price === '' ? '' : Number(values.price),
          categoryId: values.categoryId === '' ? '' : Number(values.categoryId),
          conditionId: values.conditionId === '' ? '' : Number(values.conditionId),
        },
        selectedFile,
      )
    } catch (submitError) {
      dispatch({ type: 'SET_ERROR', payload: submitError?.message || 'Nao foi possivel guardar o anuncio.' })
    }
  }

  return (
    <div className="market-form-layout">
      <form className="market-form" onSubmit={handleSubmit}>
        <label className="market-form-full">
          <span>Titulo</span>
          <input
            value={values.title}
            onChange={(event) => handleChange('title', event.target.value)}
            placeholder="Ex.: Sapatos de Jazz n. 39"
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
          </select>
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
            placeholder="Ex.: EntArtes - rececao"
          />
        </label>

        <label className="market-form-full">
          <span>Descricao</span>
          <textarea
            rows={4}
            maxLength={255}
            value={values.description}
            onChange={(event) => handleChange('description', event.target.value)}
            placeholder="Detalhes do artigo, estado e forma de entrega"
          />
        </label>

        <label className="market-form-full">
          <span>Imagem</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => dispatch({ type: 'SET_SELECTED_FILE', payload: event.target.files?.[0] || null })}
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
            {previewUrl ? <img src={previewUrl} alt="Pre-visualizacao do anuncio" /> : <span>Imagem do anuncio</span>}
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
