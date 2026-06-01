import api from './api'

const adminTimetablesService = {
  listTimetables: async () => {
    const { data } = await api.get('/timetables')
    return Array.isArray(data) ? data : []
  },
  getTimetable: async (id) => {
    const { data } = await api.get(`/timetables/${id}`)
    return data
  },
  createTimetable: async (payload) => {
    const { data } = await api.post('/timetables', payload)
    return data
  },
  updateTimetable: async (id, payload) => {
    const { data } = await api.patch(`/timetables/${id}`, payload)
    return data
  },
  deleteTimetable: async (id) => {
    await api.delete(`/timetables/${id}`)
  },
  createSlot: async (timetableId, payload) => {
    const { data } = await api.post(`/timetables/${timetableId}/slots`, payload)
    return data
  },
  updateSlot: async (slotId, payload) => {
    const { data } = await api.patch(`/timetables/slots/${slotId}`, payload)
    return data
  },
  deleteSlot: async (slotId) => {
    await api.delete(`/timetables/slots/${slotId}`)
  },
}

export default adminTimetablesService
