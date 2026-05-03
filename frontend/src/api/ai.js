import { apiClient } from './client';

export async function explain(prompt, context) {
  const { data } = await apiClient.post('/ai/explain', { prompt, context });
  return data;
}

export async function summarise(lessonId) {
  const { data } = await apiClient.post('/ai/summarise', { lesson_id: lessonId });
  return data;
}
