export function uniqueNames(values) {
	if (!Array.isArray(values)) {
		return []
	}

	const map = new Map()

	values.forEach((entry) => {
		const normalized = String(entry || '').trim()
		if (!normalized) {
			return
		}

		const key = normalized.toLowerCase()
		if (!map.has(key)) {
			map.set(key, normalized)
		}
	})

	return Array.from(map.values()).sort((a, b) => a.localeCompare(b))
}