/**
 * @file src/components/MarketplaceImage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { getApiOrigin } from '../utils/network'
import { resolveMarketplacePhotoUrl } from '../utils/marketplace-photo-url'

function shouldFetchWithAuth(normalizedUrl) {
	if (!normalizedUrl || /^(data:|blob:)/i.test(normalizedUrl)) {
		return false
	}

	if (normalizedUrl.startsWith('/api/') || normalizedUrl.startsWith('/uploads/')) {
		return true
	}

	if (/^https?:\/\//i.test(normalizedUrl)) {
		try {
			const parsed = new URL(normalizedUrl)
			return parsed.origin === window.location.origin || parsed.origin === getApiOrigin()
		} catch {
			return false
		}
	}

	return true
}

export default function MarketplaceImage({ src, alt, className, fallback = null }) {
	const normalizedSrc = useMemo(() => resolveMarketplacePhotoUrl(src), [src])
	const needsAuth = useMemo(() => shouldFetchWithAuth(normalizedSrc), [normalizedSrc])
	const [resolvedImage, setResolvedImage] = useState({ src: '', forSrc: '' })

	useEffect(() => {
		let cancelled = false
		let objectUrl = ''

		if (!normalizedSrc || !needsAuth) {
			return undefined
		}

		const requestUrl = normalizedSrc.startsWith('http') ? normalizedSrc : new URL(normalizedSrc, window.location.origin).href

		api
			.get(requestUrl, { responseType: 'blob' })
			.then((response) => {
				const nextObjectUrl = URL.createObjectURL(response.data)

				if (cancelled) {
					URL.revokeObjectURL(nextObjectUrl)
					return
				}

				objectUrl = nextObjectUrl
				setResolvedImage({ src: nextObjectUrl, forSrc: normalizedSrc })
			})
			.catch(() => {
				if (!cancelled) {
					setResolvedImage({ src: '', forSrc: normalizedSrc })
				}
			})

		return () => {
			cancelled = true

			if (objectUrl) {
				URL.revokeObjectURL(objectUrl)
			}
		}
	}, [normalizedSrc, needsAuth])

	if (!normalizedSrc) {
		return fallback
	}

	if (!needsAuth) {
		return <img className={className} src={normalizedSrc} alt={alt} />
	}

	if (resolvedImage.forSrc !== normalizedSrc || !resolvedImage.src) {
		return fallback
	}

	return <img className={className} src={resolvedImage.src} alt={alt} />
}