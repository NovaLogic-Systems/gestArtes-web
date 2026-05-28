import api from './api'

const adminTimetablesService = {
  listTimetables: async () => {
    const { data } = await api.get('/timetables')
    return data
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
  importOcr: async (files) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    const { data } = await api.post('/timetables/import/ocr', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data
  },
  confirmImport: async (payload) => {
    const { data } = await api.post('/timetables/import/confirm', payload)
    return data
  }
}

export default adminTimetablesService
