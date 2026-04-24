import Badge from './ui/Badge'
import Button from './ui/Button'

function formatMoney(value) {
	const numeric = Number(value)

	if (Number.isNaN(numeric)) {
		return 'Taxa sob consulta'
	}

	return new Intl.NumberFormat('pt-PT', {
		currency: 'EUR',
		style: 'currency',
	}).format(numeric)
}

export default function InventoryItemCard({ item, onOpenDetails, onRent }) {
	const availableQuantity = Number(item?.availableQuantity ?? 0)
	const isAvailable = availableQuantity > 0
	const imageAlt = item?.itemName || 'Artigo do inventário'

	return (
		<article className="inventory-card">
			<button type="button" className="inventory-card-image" onClick={() => onOpenDetails?.(item)}>
				{item?.photoUrl ? <img src={item.photoUrl} alt={imageAlt} /> : <span>Sem imagem</span>}
			</button>

			<div className="inventory-card-body">
				<div className="inventory-card-header">
					<div>
						<p className="inventory-card-category">{item?.category?.categoryName || 'Inventário da escola'}</p>
						<button type="button" className="inventory-card-title" onClick={() => onOpenDetails?.(item)}>
							{item?.itemName || 'Artigo sem nome'}
						</button>
					</div>
					<Badge variant={isAvailable ? 'success' : 'warning'} size="sm">
						{isAvailable ? 'Disponível' : 'Reservado'}
					</Badge>
				</div>

				<p className="inventory-card-fee">{formatMoney(item?.symbolicFee)}</p>

				<div className="inventory-card-meta">
					<Badge variant="neutral" size="sm">
						Condição: {item?.conditionLabel || 'Verificado'}
					</Badge>
					<Badge variant={isAvailable ? 'info' : 'warning'} size="sm">
						{isAvailable ? `${availableQuantity} disponível` : 'Sem stock'}
					</Badge>
				</div>

				<p className="inventory-card-description">{item?.description || 'Artigo do inventário escolar disponível para requisição offline.'}</p>

				<div className="inventory-card-actions">
					<Button variant="secondary" size="sm" onClick={() => onOpenDetails?.(item)}>
						Detalhes
					</Button>
					<Button variant="cta" size="sm" disabled={!isAvailable} onClick={() => onRent?.(item)}>
						Alugar
					</Button>
				</div>
			</div>
		</article>
	)
}
