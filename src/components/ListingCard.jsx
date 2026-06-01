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
  const isSchool = listing?.origin === 'school'
  const photoUrl = isSchool ? listing?.photoUrl : resolveMarketplacePhotoUrl(listing?.photoUrl)
  
  const statusLabel = isSchool
    ? (Number(listing?.availableQuantity ?? 0) > 0 ? `Disponível (${listing.availableQuantity} un.)` : 'Reservado')
    : resolveStatusLabel(listing?.status)

  const statusVariant = isSchool
    ? (Number(listing?.availableQuantity ?? 0) > 0 ? 'success' : 'warning')
    : resolveStatusVariant(listing?.status?.statusName)

  const priceValue = isSchool ? (listing?.symbolicFee ?? listing?.price) : listing?.price

  const conditionName = isSchool
    ? (listing?.conditionLabel || listing?.condition?.conditionName || 'Verificado')
    : (listing?.condition?.conditionName || 'Não informado')

  const locationLabel = isSchool ? 'Escola' : (listing?.location || 'Localização não definida')
  const dateLabel = isSchool ? 'Inventário' : formatDate(listing?.createdAt)
  const resolvedOriginLabel = originLabel || (isSchool ? 'Escola' : 'Comunidade')

  return (
    <article className="market-listing-card">
      <button type="button" className="market-listing-image" onClick={() => onOpen?.(listing)}>
        {isSchool ? (
          photoUrl ? (
            <img src={photoUrl} alt={`Foto do artigo ${listing?.title || ''}`} />
          ) : (
            <span>Sem imagem</span>
          )
        ) : photoUrl ? (
          <MarketplaceImage src={photoUrl} alt={`Foto do anúncio ${listing?.title || ''}`} fallback={<span>Sem imagem</span>} />
        ) : (
          <span>Sem imagem</span>
        )}
      </button>

      <div className="market-listing-content">
        <div 
          className={`market-listing-origin-badge origin-${listing?.origin || 'community'}`}
          title={resolvedOriginLabel}
        >
          {listing?.origin === 'school' ? (
            <span>🏢 Escola</span>
          ) : (
            <span>👥 {resolvedOriginLabel}</span>
          )}
        </div>

        <button type="button" className="market-listing-title" onClick={() => onOpen?.(listing)}>
          {listing?.title || 'Artigo sem título'}
        </button>

        <p className="market-listing-price">
          {formatMoney(priceValue)}
        </p>

        <p className="market-listing-condition">
          Condição: {conditionName}
        </p>

        <p className="market-listing-meta">
          {listing?.category?.categoryName || 'Categoria geral'}
          {' · '}
          {locationLabel}
          {' · '}
          {dateLabel}
        </p>

        {statusLabel ? (
          <div className="market-listing-status">
            <span className="market-listing-status-badge" data-variant={statusVariant || 'neutral'}>
              {statusLabel}
            </span>
          </div>
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
            {isSchool ? (
              <>
                <button
                  type="button"
                  className="market-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onBuy?.(listing)
                  }}
                  disabled={Number(listing.availableQuantity ?? 0) <= 0}
                >
                  Alugar
                </button>
                <button 
                  type="button" 
                  className="market-btn market-btn-secondary" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpen?.(listing)
                  }}
                >
                  Detalhes
                </button>
              </>
            ) : (
              <button
                type="button"
                className="market-btn"
                style={{ width: '100%', flex: 'none' }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onBuy) {
                    onBuy(listing)
                  } else {
                    onOpen?.(listing)
                  }
                }}
              >
                Comprar
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
