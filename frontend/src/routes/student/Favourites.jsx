import { Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { listLessons } from '../../api/lessons';
import { LessonCard } from '../../components/LessonCard';
import { useLessonStore } from '../../store/lessonStore';

export default function Favourites() {
  const favouriteIds = useLessonStore((s) => s.favouriteIds);
  const loadFavourites = useLessonStore((s) => s.loadFavourites);
  const toggleFavourite = useLessonStore((s) => s.toggleFavourite);

  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await loadFavourites();
        const lessons = await listLessons();
        setAllLessons(lessons);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFavourites]);

  const favourites = useMemo(
    () => allLessons.filter((l) => favouriteIds.has(l.id)),
    [allLessons, favouriteIds],
  );

  return (
    <div className="space-y-6 pt-4">
      <header className="space-y-2">
        <p className="label-eyebrow">таңдаулы</p>
        <h1 className="font-serif text-[24px] leading-tight text-ink">
          Сақталған сабақтар
        </h1>
        <p className="text-[14px] text-ink-muted">
          Кейін қайта оралғың келетіндер.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : favourites.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center">
          <Heart size={20} className="mx-auto mb-3 text-ink-faint" />
          <p className="text-[13px] text-ink-muted">
            Әзірге таңдаулы сабақ жоқ. Кітапханадан жүректі бас.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {favourites.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              isFavourite
              onToggleFavourite={toggleFavourite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
