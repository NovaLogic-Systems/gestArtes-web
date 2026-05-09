/**
 * @file src/components/ui/Table.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { cn } from './shared'

function Table({
	columns = [],
	rows = [],
	getRowKey,
	caption,
	emptyState = 'Sem registos para apresentar.',
	striped = true,
	compact = false,
	headBackground = '#f4f4f8',
	cellPadding,
	className,
	style,
	renderRowActions,
	rowActionsVerticalAlign,
	rowActionsHeader,
}) {
	const resolvedCellPadding = cellPadding ?? (compact ? '0.56rem 0.65rem' : '0.625rem 0.7rem')

	return (
		<div
			className={cn('ui-table-wrapper', className)}
			style={{
				background: 'var(--bg, #ffffff)',
				border: '1px solid var(--border, #e8e8f0)',
				borderRadius: '1rem',
				overflow: 'hidden',
				...style,
			}}
		>
			<div style={{ overflowX: 'auto' }}>
				<table style={{ borderCollapse: 'collapse', minWidth: '100%', width: '100%' }}>
				{caption ? <caption style={{ padding: '0.75rem', textAlign: 'left' }}>{caption}</caption> : null}
				<thead>
					<tr>
						{columns.map((column) => (
							<th
								key={column.key ?? column.header}
								scope="col"
								style={{
									background: headBackground,
									borderBottom: '1px solid var(--border, #e8e8f0)',
									color: 'var(--text-h, #374151)',
									fontSize: '0.85rem',
									fontWeight: 700,
									padding: resolvedCellPadding,
									textAlign: column.align ?? 'left',
									whiteSpace: 'nowrap',
									width: column.width,
								}}
							>
								{column.header}
							</th>
						))}
						{renderRowActions ? (
							<th
								scope="col"
								style={{
									background: headBackground,
									borderBottom: '1px solid var(--border)',
									padding: resolvedCellPadding,
									textAlign: 'center',
									color: 'var(--text-h)',
									fontSize: '0.85rem',
									fontWeight: 700,
								}}
							>
								{rowActionsHeader || ''}
							</th>
						) : null}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length + (renderRowActions ? 1 : 0)}
								style={{ color: 'var(--text)', padding: '1.25rem', textAlign: 'center' }}
							>
								{emptyState}
							</td>
						</tr>
					) : (
						rows.map((row, index) => {
							const rowKey = getRowKey?.(row, index) ?? row.id ?? index

							return (
								<tr key={rowKey} style={{ background: striped && index % 2 ? 'var(--social-bg)' : 'transparent' }}>
									{columns.map((column) => (
										<td
											key={column.key ?? column.header}
											style={{
												borderBottom: '1px solid var(--border)',
												color: 'var(--text-h)',
												padding: resolvedCellPadding,
												textAlign: column.align ?? 'left',
												verticalAlign: column.verticalAlign ?? 'top',
											}}
										>
											{column.render ? column.render(row, index) : row[column.key]}
										</td>
									))}
									{renderRowActions ? (
										<td
											style={{
												borderBottom: '1px solid var(--border)',
												padding: resolvedCellPadding,
												textAlign: 'center',
												...(rowActionsVerticalAlign ? { verticalAlign: rowActionsVerticalAlign } : {}),
											}}
										>
											{renderRowActions(row, index)}
										</td>
									) : null}
								</tr>
							)
						})
					)}
				</tbody>
				</table>
			</div>
		</div>
	)
}

export default Table
export { Table }
