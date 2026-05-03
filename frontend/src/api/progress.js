import { apiClient } from './client';

export async function openLesson(lessonId) {
  const { data } = await apiClient.post(`/progress/${lessonId}/open`);
  return data;
}

export async function patchProgress(lessonId, payload) {
  const { data } = await apiClient.patch(`/progress/${lessonId}`, payload);
  return data;
}

export async function completeLesson(lessonId) {
  const { data } = await apiClient.post(`/progress/${lessonId}/complete`);
  return data;
}

export async function listMyProgress() {
  const { data } = await apiClient.get('/progress/mine');
  return data;
}
