import { History as HistoryIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { listLessons } from '../../api/lessons';
import { LessonCard } from '../../components/LessonCard';
import { useLessonStore } from '../../store/lessonStore';

export default function History() {
  const myProgress = useLessonStore((s) => s.myProgress);
  const favouriteIds = useLessonStore((s) => s.favouriteIds);
  const loadMyProgress = useLessonStore((s) => s.loadMyProgress);
  const toggleFavourite = useLessonStore((s) => s.toggleFavourite);

  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await loadMyProgress();
        const lessons = await listLessons();
        setAllLessons(lessons);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMyProgress]);

  const items = useMemo(() => {
    const byId = new Map(allLessons.map((l) => [l.id, l]));
    return myProgress
      .map((p) => ({ progress: p, lesson: byId.get(p.lesson_id) }))
      .filter((x) => x.lesson);
  }, [allLessons, myProgress]);

  const completedCount = items.filter((x) => x.progress.status === 'completed').length;

  return (
    <div className="space-y-6 pt-4">
      <header className="space-y-2">
        <p className="label-eyebrow">тарих</p>
        <h1 className="font-serif text-[24px] leading-tight text-ink">
          Оқу тарихы
        </h1>
        <p className="text-[14px] text-ink-muted">
          Барлығы {items.length} жоба ашылды, {completedCount} аяқталды.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center">
          <HistoryIcon size={20} className="mx-auto mb-3 text-ink-faint" />
          <p className="text-[13px] text-ink-muted">
            Әлі бірде-бір жоба ашылмаған.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(({ lesson, progress }) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              status={progress.status}
              isFavourite={favouriteIds.has(lesson.id)}
              onToggleFavourite={toggleFavourite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
