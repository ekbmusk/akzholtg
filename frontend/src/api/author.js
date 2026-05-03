import { apiClient } from './client';

export async function getStats() {
  const { data } = await apiClient.get('/author/stats');
  return data;
}

export async function listAllLessons() {
  const { data } = await apiClient.get('/author/lessons');
  return data;
}

export async function createLesson(payload) {
  const { data } = await apiClient.post('/author/lessons', payload);
  return data;
}

export async function updateLesson(id, payload) {
  const { data } = await apiClient.patch(`/author/lessons/${id}`, payload);
  return data;
}

export async function deleteLesson(id) {
  await apiClient.delete(`/author/lessons/${id}`);
}

export async function publishLesson(id) {
  const { data } = await apiClient.post(`/author/lessons/${id}/publish`);
  return data;
}

export async function unpublishLesson(id) {
  const { data } = await apiClient.post(`/author/lessons/${id}/unpublish`);
  return data;
}

export async function broadcast({ text, lesson_id }) {
  const { data } = await apiClient.post('/author/broadcast', { text, lesson_id });
  return data;
}

export async function uploadImages(files) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const { data } = await apiClient.post('/uploads/lesson-images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.files;
}
