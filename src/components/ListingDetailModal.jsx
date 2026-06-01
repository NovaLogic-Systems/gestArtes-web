/**
 * @file src/components/ListingDetailModal.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { resolveMarketplacePhotoUrl } from '../utils/marketplace-photo-url'
import MarketplaceImage from './MarketplaceImage'
import Modal from './ui/Modal'

function normalizePhone(phoneNumber) {
  const digitsOnly = String(phoneNumber || '').replace(/\D/g, '')
  return digitsOnly
}

export default function ListingDetailModal({ open, listing, onClose, onRent }) {
  const isSchool = listing?.origin === 'school'
  const seller = listing?.seller ?? null
  const whatsappDigits = normalizePhone(seller?.phoneNumber)
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
  const mailHref = seller?.email ? `mailto:${seller.email}` : null
  const photoUrl = isSchool ? listing?.photoUrl : resolveMarketplacePhotoUrl(listing?.photoUrl)

  const isAvailable = isSchool ? Number(listing?.availableQuantity ?? 0) > 0 : true
  const priceValue = isSchool ? (listing?.symbolicFee ?? listing?.price) : listing?.price
  const conditionName = isSchool
    ? (listing?.conditionLabel || listing?.condition?.conditionName || 'Verificado')
    : (listing?.condition?.conditionName || 'Não informado')
  
  const isContactLoading = !isSchool && !seller?.email && !seller?.phoneNumber

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={listing?.title || (isSchool ? 'Detalhe do artigo' : 'Detalhe do anúncio')}
      description={listing?.description || 'Sem descrição adicional.'}
      size="lg"
      footer={isSchool ? (
        <div className="modal-footer-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
          {isAvailable && onRent ? (
            <button
              type="button"
              className="market-btn"
              onClick={() => {
                onClose()
                onRent(listing)
              }}
            >
              Alugar este artigo
            </button>
          ) : null}
          <button type="button" className="market-btn market-btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      ) : null}
    >
      <div className="market-detail-grid">
        <div>
          {photoUrl ? (
            isSchool ? (
              <img src={photoUrl} alt={listing.title || 'Artigo'} className="market-detail-image" />
            ) : (
              <MarketplaceImage
                src={photoUrl}
                alt={listing.title || 'Anúncio'}
                className="market-detail-image"
                fallback={<div className="market-detail-image market-detail-image-empty">Sem imagem</div>}
              />
            )
          ) : (
            <div className="market-detail-image market-detail-image-empty">Sem imagem</div>
          )}
        </div>

        <div className="market-detail-body">
          <p>
            <strong>{isSchool ? 'Taxa simbólica:' : 'Preço:'}</strong>{' '}
            {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(priceValue || 0))}
          </p>
          <p><strong>Categoria:</strong> {listing?.category?.categoryName || 'Sem categoria'}</p>
          <p><strong>Condição:</strong> {conditionName}</p>
          
          {isSchool ? (
            <>
              <p><strong>Estado:</strong> {isAvailable ? 'Disponível' : 'Reservado'}</p>
              <p><strong>Unidades disponíveis:</strong> {listing?.availableQuantity ?? 0} / {listing?.totalQuantity ?? 0}</p>
            </>
          ) : (
            <>
              <p><strong>Localização:</strong> {listing?.location || 'Não informada'}</p>
              <div className="market-contact-box">
                <h4>Contacto do vendedor</h4>
                {isContactLoading ? (
                  <p style={{ fontSize: '0.85rem', color: '#6d6480', fontStyle: 'italic', margin: 0 }}>A carregar contactos...</p>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
