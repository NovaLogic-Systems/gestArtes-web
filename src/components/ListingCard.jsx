function formatMoney(value) {
  const numeric = Number(value)

  if (Number.isNaN(numeric)) {
    return 'Preco sob consulta'
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

export default function ListingCard({
  listing,
  onOpen,
  onEdit,
  onDelete,
  showOwnerActions = false,
}) {
  const photoUrl = listing?.photoUrl || null

  return (
    <article className="market-listing-card">
      <button type="button" className="market-listing-image" onClick={() => onOpen?.(listing)}>
        {photoUrl ? (
          <img src={photoUrl} alt={`Foto do anuncio ${listing?.title || ''}`} />
        ) : (
          <span>Sem imagem</span>
        )}
      </button>

      <div className="market-listing-content">
        <button type="button" className="market-listing-title" onClick={() => onOpen?.(listing)}>
          {listing?.title || 'Anuncio sem titulo'}
        </button>

        <p className="market-listing-price">{formatMoney(listing?.price)}</p>

        <p className="market-listing-meta">
          {listing?.category?.categoryName || 'Categoria geral'}
          {' · '}
          {listing?.location || 'Localizacao nao definida'}
          {' · '}
          {formatDate(listing?.createdAt)}
        </p>

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
            <button type="button" className="market-btn" onClick={() => onOpen?.(listing)}>
              Ver detalhes
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
