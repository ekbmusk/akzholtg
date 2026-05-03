import { apiClient } from './client';

export async function listFavourites() {
  const { data } = await apiClient.get('/favourites/');
  return data;
}

export async function addFavourite(lessonId) {
  const { data } = await apiClient.post(`/favourites/${lessonId}`);
  return data;
}

export async function removeFavourite(lessonId) {
  await apiClient.delete(`/favourites/${lessonId}`);
}
