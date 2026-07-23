import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const client = axios.create({ baseURL });

export async function fetchLogs(params) {
  const { data } = await client.get('/logs', { params });
  return data; // { data: [...], pagination: {...} }
}

export async function fetchFacets() {
  const { data } = await client.get('/logs/facets');
  return data;
}

export async function fetchLogById(id) {
  const { data } = await client.get(`/logs/${id}`);
  return data;
}

export async function bulkUploadLogs(logs) {
  const { data } = await client.post('/logs/bulk', { logs });
  return data;
}

export default client;
