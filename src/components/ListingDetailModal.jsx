import { resolveMarketplacePhotoUrl } from '../utils/marketplace-photo-url'
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
  const photoUrl = resolveMarketplacePhotoUrl(listing?.photoUrl)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={listing?.title || 'Detalhe do anuncio'}
      description={listing?.description || 'Sem descricao adicional.'}
      size="lg"
    >
      <div className="market-detail-grid">
        <div>
          {photoUrl ? (
            <img className="market-detail-image" src={photoUrl} alt={listing.title || 'Anuncio'} />
          ) : (
            <div className="market-detail-image market-detail-image-empty">Sem imagem</div>
          )}
        </div>

        <div className="market-detail-body">
          <p><strong>Preco:</strong> {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(listing?.price || 0))}</p>
          <p><strong>Categoria:</strong> {listing?.category?.categoryName || 'Sem categoria'}</p>
          <p><strong>Estado:</strong> {listing?.condition?.conditionName || 'Nao informado'}</p>
          <p><strong>Localizacao:</strong> {listing?.location || 'Nao informada'}</p>

          <div className="market-contact-box">
            <h4>Conversations (externo)</h4>
            <p>Este modulo nao inclui chat interno. Contacta o vendedor por canais externos.</p>
            {mailHref ? (
              <a className="market-contact-link" href={mailHref}>
                Contact seller (Email)
              </a>
            ) : null}
            {whatsappHref ? (
              <a className="market-contact-link" href={whatsappHref} target="_blank" rel="noreferrer">
                Contact seller (WhatsApp)
              </a>
            ) : null}
            {!mailHref && !whatsappHref ? <p>Vendedor sem contacto publico.</p> : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}
