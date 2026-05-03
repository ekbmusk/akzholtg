import { apiClient } from './client';

export async function listLessons({ subject, difficulty, tag, search } = {}) {
  const { data } = await apiClient.get('/lessons/', {
    params: {
      ...(subject ? { subject } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tag } : {}),
      ...(search ? { search } : {}),
    },
  });
  return data;
}

export async function getLesson(id) {
  const { data } = await apiClient.get(`/lessons/${id}`);
  return data;
}

export async function listFeatured() {
  const { data } = await apiClient.get('/lessons/featured');
  return data;
}

export async function listSubjects() {
  const { data } = await apiClient.get('/lessons/subjects');
  return data;
}
