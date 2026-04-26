import api from './api';

const studioOccupancyService = {
  getRealTime: async (at = new Date().toISOString()) => {
    const response = await api.get('/admin/studio-occupancy/real-time', { params: { at } });
    return response.data;
  },
  getForecast: async (from, to) => {
    const response = await api.get('/admin/studio-occupancy/forecast', { params: { from, to } });
    return response.data;
  },
  blockStudio: async ({ studioId, startsAt, endsAt, reason, blockType }) => {
    const response = await api.post('/admin/studio-occupancy/block', {
      studioId,
      startsAt,
      endsAt,
      reason,
      blockType,
    });
    return response.data;
  },
  updateStudioStatus: async (studioId, { status, reason, startsAt, endsAt }) => {
    const response = await api.patch(`/admin/studio-occupancy/${studioId}/status`, {
      status,
      reason,
      startsAt,
      endsAt,
    });
    return response.data;
  },
};

export default studioOccupancyService;
