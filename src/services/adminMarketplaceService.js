import api from './api'

function toNumber(value) {
  const numeric = Number(value)

  return Number.isNaN(numeric) ? 0 : numeric
}

function mapListing(entry) {
  return {
    listingId: entry?.listingId ?? entry?.MarketplaceItemID ?? '',
    sellerId: entry?.sellerId ?? entry?.SellerID ?? '',
    title: String(entry?.title ?? entry?.Title ?? '').trim(),
    description: String(entry?.description ?? entry?.Description ?? '').trim(),
    rejectionReason: String(entry?.rejectionReason ?? entry?.RejectionReason ?? '').trim(),
    price: toNumber(entry?.price ?? entry?.Price),
    category: entry?.category
      ? {
          categoryId: entry.category.categoryId ?? entry.category.CategoryID ?? '',
          categoryName: String(entry.category.categoryName ?? entry.category.CategoryName ?? '').trim(),
        }
      : null,
    condition: entry?.condition
      ? {
          conditionId: entry.condition.conditionId ?? entry.condition.ConditionID ?? '',
          conditionName: String(entry.condition.conditionName ?? entry.condition.ConditionName ?? '').trim(),
        }
      : null,
    status: entry?.status
      ? {
          statusId: entry.status.statusId ?? entry.status.StatusID ?? '',
          statusName: String(entry.status.statusName ?? entry.status.StatusName ?? '').trim(),
        }
      : null,
    photoUrl: String(entry?.photoUrl ?? entry?.PhotoURL ?? '').trim(),
    location: String(entry?.location ?? entry?.Location ?? '').trim(),
    createdAt: entry?.createdAt ?? entry?.CreatedAt ?? null,
    isActive: Boolean(entry?.isActive ?? entry?.IsActive),
    seller: entry?.seller
      ? {
          userId: entry.seller.userId ?? entry.seller.UserID ?? '',
          firstName: String(entry.seller.firstName ?? entry.seller.FirstName ?? '').trim(),
          lastName: String(entry.seller.lastName ?? entry.seller.LastName ?? '').trim(),
          email: String(entry.seller.email ?? entry.seller.Email ?? '').trim(),
          phoneNumber: String(entry.seller.phoneNumber ?? entry.seller.PhoneNumber ?? '').trim(),
        }
      : null,
  }
}

const adminMarketplaceService = {
  async listListings(filters = {}) {
    const response = await api.get('/admin/marketplace/listings', { params: filters })
    const listings = Array.isArray(response.data?.listings) ? response.data.listings : []

    return listings.map(mapListing)
  },

  async approveListing(listingId) {
    const response = await api.patch(`/admin/marketplace/listings/${listingId}/approve`)
    return mapListing(response.data?.listing ?? response.data)
  },

  async rejectListing(listingId, reason) {
    const response = await api.patch(`/admin/marketplace/listings/${listingId}/reject`, { reason })
    return mapListing(response.data?.listing ?? response.data)
  },

  async deleteListing(listingId) {
    await api.delete(`/admin/marketplace/listings/${listingId}`)
  },
}

export default adminMarketplaceService