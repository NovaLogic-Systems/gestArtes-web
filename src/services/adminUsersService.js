import api from './api'

function mapUser(entry) {
  return {
    userId: entry?.userId ?? entry?.UserID ?? '',
    firstName: String(entry?.firstName ?? entry?.FirstName ?? '').trim(),
    lastName: String(entry?.lastName ?? entry?.LastName ?? '').trim(),
    email: String(entry?.email ?? entry?.Email ?? '').trim(),
    phoneNumber: String(entry?.phoneNumber ?? entry?.PhoneNumber ?? '').trim(),
    isActive: Boolean(entry?.isActive ?? entry?.IsActive),
    createdAt: entry?.createdAt ?? entry?.CreatedAt ?? null,
    role: String(entry?.role || '').trim().toLowerCase(),
    roleLabel: String(entry?.roleLabel || entry?.role || '').trim(),
  }
}

const adminUsersService = {
  async listUsers() {
    const response = await api.get('/admin/users')
    const users = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.users)
        ? response.data.users
        : []

    return users.map(mapUser)
  },

  async createUser(payload) {
    const response = await api.post('/admin/users', payload)
    return mapUser(response.data?.user ?? response.data)
  },
}

export default adminUsersService
