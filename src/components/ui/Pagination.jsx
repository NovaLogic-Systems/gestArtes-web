/**
 * @file src/components/ui/Pagination.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import Button from './Button'

function buildPageItems(currentPage, totalPages, siblingCount = 1, boundaryCount = 1) {
  if (totalPages <= 1) return []

  const startPages = Array.from({ length: Math.min(boundaryCount, totalPages) }, (_, index) => index + 1)
  const endStart = Math.max(totalPages - boundaryCount + 1, boundaryCount + 1)
  const endPages = Array.from({ length: Math.max(0, totalPages - endStart + 1) }, (_, index) => endStart + index)

  const siblingsStart = Math.max(
    Math.min(currentPage - siblingCount, totalPages - boundaryCount - siblingCount * 2 - 2),
    boundaryCount + 2,
  )
  const siblingsEnd = Math.min(
    Math.max(currentPage + siblingCount, boundaryCount + siblingCount * 2 + 3),
    endStart - 2,
  )

  const items = [...startPages]

  if (siblingsStart > boundaryCount + 2) {
    items.push('ellipsis-left')
  } else if (boundaryCount + 1 < siblingsStart) {
    items.push(boundaryCount + 1)
  }

  for (let page = siblingsStart; page <= siblingsEnd; page += 1) {
    if (page > boundaryCount && page < endStart) {
      items.push(page)
    }
  }

  if (siblingsEnd < endStart - 2) {
    items.push('ellipsis-right')
  } else if (siblingsEnd + 1 < endStart) {
    items.push(endStart - 1)
  }

  for (const page of endPages) {
    if (!items.includes(page)) {
      items.push(page)
    }
  }

  return items
}

function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className,
  style,
  ariaLabel = 'Paginação',
}) {
  if (!totalPages || totalPages <= 1) {
    return null
  }

  const pages = buildPageItems(currentPage, totalPages)

  return (
    <nav
      aria-label={ariaLabel}
      className={className}
      style={{
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        justifyContent: 'center',
        marginTop: '1rem',
        ...style,
      }}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
      >
        ‹
      </Button>

      {pages.map((item) => {
        if (typeof item === 'string') {
          return (
            <span key={item} aria-hidden="true" style={{ color: 'var(--text-muted, #718096)', padding: '0 0.25rem' }}>
              …
            </span>
          )
        }

        const isActive = item === currentPage

        return (
          <Button
            key={item}
            type="button"
            variant={isActive ? 'cta' : 'secondary'}
            size="sm"
            onClick={() => onPageChange?.(item)}
            aria-current={isActive ? 'page' : undefined}
          >
            {item}
          </Button>
        )
      })}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
      >
        ›
      </Button>
    </nav>
  )
}

export default Pagination