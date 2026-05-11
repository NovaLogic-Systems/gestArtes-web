import { useState } from 'react'
import ListingForm from '../ListingForm'
import { createInventoryItem, updateInventoryItem } from '../../services/inventory'

const DEFAULT_CATEGORIES = [
  { categoryId: 1, categoryName: 'Vestuário (Costumes)' },
  { categoryId: 2, categoryName: 'Acessórios' },
  { categoryId: 3, categoryName: 'Cenografia' },
]

const DEFAULT_CONDITIONS = [
  { conditionId: 1, conditionName: 'Bom' },
  { conditionId: 2, conditionName: 'Usado' },
  { conditionId: 3, conditionName: 'Danificado' },
]

export default function InventoryForm({ initialValues = {}, onSaved, onCancel }) {
  const [busy, setBusy] = useState(false)

  async function handleSubmit(values, selectedFile) {
    setBusy(true)
    try {
      const payload = {
        itemName: values.title,
        description: values.description,
        symbolicFee: values.price === '' ? null : Number(values.price),
        ...(values.categoryName ? { categoryName: values.categoryName } : { categoryId: values.categoryId === '' ? null : Number(values.categoryId) }),
        conditionId: values.conditionId === '' ? null : Number(values.conditionId),
        location: values.location,
        isSchoolOwned: true,
        availability: values.availability ?? null,
      }

      let saved
      if (initialValues && initialValues.itemId) {
        saved = await updateInventoryItem(initialValues.itemId, payload, selectedFile)
      } else {
        saved = await createInventoryItem(payload, selectedFile)
      }

      onSaved?.(saved)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ListingForm
        initialValues={{
          title: initialValues.itemName,
          description: initialValues.description,
          price: initialValues.symbolicFee,
          categoryId: initialValues.categoryId,
          conditionId: initialValues.conditionId,
          location: initialValues.location,
        }}
        categories={DEFAULT_CATEGORIES}
        conditions={DEFAULT_CONDITIONS}
        allowNewCategory
        submitLabel={initialValues && initialValues.itemId ? 'Atualizar artigo' : 'Criar artigo'}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </div>
  )
}
