import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { LessonCard } from '../../components/LessonCard';
import { cn } from '../../lib/cn';
import { useLessonStore } from '../../store/lessonStore';

export default function Library() {
  const subjects = useLessonStore((s) => s.subjects);
  const featured = useLessonStore((s) => s.featured);
  const catalogueByKey = useLessonStore((s) => s.catalogueByKey);
  const favouriteIds = useLessonStore((s) => s.favouriteIds);
  const loadSubjects = useLessonStore((s) => s.loadSubjects);
  const loadFeatured = useLessonStore((s) => s.loadFeatured);
  const loadCatalogue = useLessonStore((s) => s.loadCatalogue);
  const loadFavourites = useLessonStore((s) => s.loadFavourites);
  const toggleFavourite = useLessonStore((s) => s.toggleFavourite);

  const [activeSubject, setActiveSubject] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSubjects();
    loadFeatured();
    loadFavourites();
  }, [loadSubjects, loadFeatured, loadFavourites]);

  useEffect(() => {
    loadCatalogue({ subject: activeSubject, search: search || undefined });
  }, [activeSubject, search, loadCatalogue]);

  const key = `${activeSubject ?? '__all__'}|${search ?? ''}`;
  const lessons = catalogueByKey[key] || [];

  const showFeatured = !activeSubject && !search && featured.length > 0;

  return (
    <div className="space-y-6 pt-4">
      <header className="space-y-2">
        <p className="label-eyebrow">жобалар</p>
        <h1 className="font-serif text-[24px] leading-tight text-ink">
          Сабаққа дайындал.
        </h1>
        <p className="text-[14px] text-ink-muted">
          Зертханалық жобамен сабақ алдында таныс — не істейміз, не керек,
          қандай қадамдар бар.
        </p>
      </header>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Жобаны іздеу…"
          className="w-full rounded-2xl border border-border bg-surface/60 py-2.5 pl-9 pr-9 text-[14px] text-ink placeholder:text-ink-faint focus:border-primary/50 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-faint hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <SubjectChip
            label="Барлығы"
            active={activeSubject === null}
            onClick={() => setActiveSubject(null)}
          />
          {subjects.map((s) => (
            <SubjectChip
              key={s.code}
              label={s.title_kk}
              count={s.lesson_count}
              color={s.color}
              active={activeSubject === s.code}
              onClick={() =>
                setActiveSubject((cur) => (cur === s.code ? null : s.code))
              }
            />
          ))}
        </div>
      </div>

      {showFeatured && (
        <section className="space-y-3">
          <p className="label-eyebrow">таңдамалы</p>
          <div className="grid gap-3">
            {featured.map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                isFavourite={favouriteIds.has(l.id)}
                onToggleFavourite={toggleFavourite}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="label-eyebrow">
          {activeSubject
            ? subjects.find((s) => s.code === activeSubject)?.title_kk || activeSubject
            : 'барлық жобалар'}
          {' · '}
          {lessons.length}
        </p>
        {lessons.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface/40 p-6 text-center text-[13px] text-ink-muted">
            Ештеңе табылмады.
          </p>
        ) : (
          <div className="grid gap-3">
            {lessons.map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                isFavourite={favouriteIds.has(l.id)}
                onToggleFavourite={toggleFavourite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SubjectChip({ label, count, color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={color ? { borderColor: active ? color : undefined } : undefined}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition',
        active
          ? 'border-primary bg-primary/15 text-ink'
          : 'border-border bg-surface/40 text-ink-muted hover:text-ink',
      )}
    >
      {label}
      {typeof count === 'number' && (
        <span className="ml-1.5 text-ink-faint">{count}</span>
      )}
    </button>
  );
}
