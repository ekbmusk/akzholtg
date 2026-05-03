import { create } from 'zustand';

import {
  getLesson as apiGet,
  listFeatured as apiFeatured,
  listLessons as apiList,
  listSubjects as apiSubjects,
} from '../api/lessons';
import {
  addFavourite as apiAddFav,
  listFavourites as apiListFav,
  removeFavourite as apiRemoveFav,
} from '../api/favourites';
import {
  completeLesson as apiComplete,
  listMyProgress as apiMyProgress,
  openLesson as apiOpen,
  patchProgress as apiPatch,
} from '../api/progress';

export const useLessonStore = create((set, get) => ({
  catalogueByKey: {},
  subjects: [],
  featured: [],
  currentLesson: null,
  currentProgress: null,
  myProgress: [],
  favouriteIds: new Set(),
  loading: false,
  error: null,

  async loadSubjects() {
    if (get().subjects.length) return get().subjects;
    const data = await apiSubjects();
    set({ subjects: data });
    return data;
  },

  async loadFeatured() {
    const data = await apiFeatured();
    set({ featured: data });
    return data;
  },

  async loadCatalogue({ subject, search } = {}) {
    const key = `${subject ?? '__all__'}|${search ?? ''}`;
    set({ loading: true, error: null });
    try {
      const data = await apiList({ subject, search });
      set((s) => ({
        catalogueByKey: { ...s.catalogueByKey, [key]: data },
      }));
      return data;
    } catch (e) {
      set({ error: e.message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  async loadLesson(id) {
    set({ loading: true, error: null });
    try {
      const data = await apiGet(id);
      set({ currentLesson: data });
      try {
        const p = await apiOpen(id);
        set({ currentProgress: p });
      } catch (_e) {
        // not blocking — student may have transient auth issue
      }
      return data;
    } catch (e) {
      set({ error: e.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  async pushProgress({ lastBlockPosition, secondsSpent } = {}) {
    const lesson = get().currentLesson;
    if (!lesson) return;
    const p = await apiPatch(lesson.id, {
      last_block_position: lastBlockPosition,
      seconds_spent: secondsSpent,
    });
    set({ currentProgress: p });
  },

  async markComplete() {
    const lesson = get().currentLesson;
    if (!lesson) return;
    const p = await apiComplete(lesson.id);
    set({ currentProgress: p });
    // Refresh local list of progress so History reflects it.
    try {
      const list = await apiMyProgress();
      set({ myProgress: list });
    } catch (_e) {}
    return p;
  },

  async loadMyProgress() {
    const data = await apiMyProgress();
    set({ myProgress: data });
    return data;
  },

  async loadFavourites() {
    const data = await apiListFav();
    set({ favouriteIds: new Set(data.map((d) => d.lesson_id)) });
    return data;
  },

  async toggleFavourite(lessonId) {
    const ids = new Set(get().favouriteIds);
    if (ids.has(lessonId)) {
      await apiRemoveFav(lessonId);
      ids.delete(lessonId);
    } else {
      await apiAddFav(lessonId);
      ids.add(lessonId);
    }
    set({ favouriteIds: ids });
  },

  resetCurrent() {
    set({ currentLesson: null, currentProgress: null });
  },
}));
