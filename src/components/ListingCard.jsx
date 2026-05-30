/**
 * @file src/components/ListingCard.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { resolveMarketplacePhotoUrl } from '../utils/marketplace-photo-url'
import MarketplaceImage from './MarketplaceImage'

function formatMoney(value) {
  const numeric = Number(value)

  if (Number.isNaN(numeric)) {
    return 'Preço sob consulta'
  }

  return new Intl.NumberFormat('pt-PT', {
    currency: 'EUR',
    style: 'currency',
  }).format(numeric)
}

function formatDate(value) {
  if (!value) {
    return 'Recente'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recente'
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function resolveStatusVariant(statusName) {
  const normalized = String(statusName || '').trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (normalized.includes('reject') || normalized.includes('rejeit')) {
    return 'danger'
  }

  if (normalized.includes('pending') || normalized.includes('pend')) {
    return 'warning'
  }

  if (normalized.includes('active') || normalized.includes('approved') || normalized.includes('published') || normalized.includes('sold') || normalized.includes('vendid')) {
    return 'success'
  }

  if (normalized.includes('reserv')) {
    return 'warning'
  }

  return 'neutral'
}

function resolveStatusLabel(status) {
  const statusName = String(status?.statusName || status || '').trim()

  if (!statusName) {
    return ''
  }

  if (/pending|pend/i.test(statusName)) {
    return 'Pendente de moderação'
  }

  if (/reject|rejeit/i.test(statusName)) {
    return 'Rejeitado'
  }

  if (/active|approved|published|publicad|aprov/i.test(statusName)) {
    return 'Ativo'
  }

  if (/remov|hidden|inactive|inativ/i.test(statusName)) {
    return 'Inativo'
  }

  if (/sold|vendid/i.test(statusName)) {
    return 'Vendido'
  }

  if (/reserv/i.test(statusName)) {
    return 'Reservado'
  }

  return 'Estado desconhecido'
}

export default function ListingCard({
  listing,
  onOpen,
  onBuy,
  onEdit,
  onDelete,
  showOwnerActions = false,
  originLabel = null,
}) {
  const photoUrl = resolveMarketplacePhotoUrl(listing?.photoUrl)
  const statusLabel = resolveStatusLabel(listing?.status)
  const statusVariant = resolveStatusVariant(listing?.status?.statusName)

  return (
    <article className="market-listing-card">
      <button type="button" className="market-listing-image" onClick={() => onOpen?.(listing)}>
        {photoUrl ? (
          <MarketplaceImage src={photoUrl} alt={`Foto do anúncio ${listing?.title || ''}`} fallback={<span>Sem imagem</span>} />
        ) : (
          <span>Sem imagem</span>
        )}
      </button>

      <div className="market-listing-content">
        <button type="button" className="market-listing-title" onClick={() => onOpen?.(listing)}>
          {listing?.title || 'Anúncio sem título'}
        </button>

        {originLabel ? (
          <span
            className="market-listing-origin"
            style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, color: '#0b9d8f', marginTop: '2px' }}
          >
            {originLabel}
          </span>
        ) : null}

        <p className="market-listing-price">{formatMoney(listing?.price)}</p>

        <p className="market-listing-condition">
          Estado: {listing?.condition?.conditionName || 'Não informado'}
        </p>

        <p className="market-listing-meta">
          {listing?.category?.categoryName || 'Categoria geral'}
          {' · '}
          {listing?.location || 'Localização não definida'}
          {' · '}
          {formatDate(listing?.createdAt)}
        </p>

        {statusLabel ? (
          <p className="market-listing-status">
            <span className="market-listing-status-badge" data-variant={statusVariant || 'neutral'}>
              {statusLabel}
            </span>
          </p>
        ) : null}

        {showOwnerActions ? (
          <div className="market-listing-actions">
            <button type="button" className="market-btn market-btn-secondary" onClick={() => onEdit?.(listing)}>
              Editar
            </button>
            <button type="button" className="market-btn market-btn-danger" onClick={() => onDelete?.(listing)}>
              Apagar
            </button>
          </div>
        ) : (
          <div className="market-listing-actions">
            <button type="button" className="market-btn" onClick={() => onBuy?.(listing) || onOpen?.(listing)}>
              Comprar
            </button>
            <button type="button" className="market-btn" onClick={() => onOpen?.(listing)}>
              Ver detalhes
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
