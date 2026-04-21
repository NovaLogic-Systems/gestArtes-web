import { useEffect, useMemo, useState } from 'react'

const DEFAULT_VALUES = {
  title: '',
  description: '',
  price: '',
  categoryId: '',
  conditionId: '',
  location: '',
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
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setValues({
      ...DEFAULT_VALUES,
      ...initialValues,
      price: initialValues?.price ?? '',
      categoryId: initialValues?.categoryId ?? initialValues?.category?.categoryId ?? '',
      conditionId: initialValues?.conditionId ?? initialValues?.condition?.conditionId ?? '',
    })
    setPreviewUrl(initialValues?.photoUrl || '')
    setSelectedFile(null)
    setError('')
  }, [initialValues])

  useEffect(() => {
    if (!selectedFile) {
      return undefined
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [selectedFile])

  const submitDisabled = useMemo(() => {
    return busy || !String(values.title || '').trim() || !String(values.price || '').trim() || !values.conditionId
  }, [busy, values.conditionId, values.price, values.title])

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
          categoryId: values.categoryId === '' ? '' : Number(values.categoryId),
          conditionId: values.conditionId === '' ? '' : Number(values.conditionId),
        },
        selectedFile,
      )
    } catch (submitError) {
      setError(submitError?.message || 'Nao foi possivel guardar o anuncio.')
    }
  }

  return (
    <form className="market-form" onSubmit={handleSubmit}>
      <label>
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

      <label>
        <span>Localizacao</span>
        <input
          value={values.location}
          maxLength={100}
          onChange={(event) => handleChange('location', event.target.value)}
          placeholder="Ex.: EntArtes - rececao"
        />
      </label>

      <label>
        <span>Imagem</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
        />
      </label>

      {previewUrl ? <img className="market-form-preview" src={previewUrl} alt="Pre-visualizacao" /> : null}

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
  )
}
