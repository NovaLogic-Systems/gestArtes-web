import Modal from './ui/Modal'

function normalizePhone(phoneNumber) {
  const digitsOnly = String(phoneNumber || '').replace(/\D/g, '')
  return digitsOnly
}

export default function ListingDetailModal({ open, listing, onClose }) {
  const seller = listing?.seller ?? null
  const whatsappDigits = normalizePhone(seller?.phoneNumber)
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
  const mailHref = seller?.email ? `mailto:${seller.email}` : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={listing?.title || 'Detalhe do anúncio'}
      description={listing?.description || 'Sem descrição adicional.'}
      size="lg"
    >
      <div className="market-detail-grid">
        <div>
          {listing?.photoUrl ? (
            <img className="market-detail-image" src={listing.photoUrl} alt={listing.title || 'Anúncio'} />
          ) : (
            <div className="market-detail-image market-detail-image-empty">Sem imagem</div>
          )}
        </div>

        <div className="market-detail-body">
          <p><strong>Preço:</strong> {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(listing?.price || 0))}</p>
          <p><strong>Categoria:</strong> {listing?.category?.categoryName || 'Sem categoria'}</p>
          <p><strong>Estado:</strong> {listing?.condition?.conditionName || 'Não informado'}</p>
          <p><strong>Localização:</strong> {listing?.location || 'Não informada'}</p>

          <div className="market-contact-box">
            <h4>Contacto do vendedor</h4>
            {mailHref ? (
              <a className="market-contact-link" href={mailHref}>
                Abrir Email
              </a>
            ) : null}
            {whatsappHref ? (
              <a className="market-contact-link" href={whatsappHref} target="_blank" rel="noreferrer">
                Abrir WhatsApp
              </a>
            ) : null}
            {!mailHref && !whatsappHref ? <p>Vendedor sem contacto público.</p> : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}
