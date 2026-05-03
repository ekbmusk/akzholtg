import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Maximize2,
  Sparkles,
  Type,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { LessonBlocks } from '../../components/LessonBlocks';
import { cn } from '../../lib/cn';
import { haptic } from '../../lib/telegram';
import { useLessonStore } from '../../store/lessonStore';
import { useUiStore } from '../../store/uiStore';

export default function Lesson() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lesson = useLessonStore((s) => s.currentLesson);
  const progress = useLessonStore((s) => s.currentProgress);
  const favouriteIds = useLessonStore((s) => s.favouriteIds);
  const loadLesson = useLessonStore((s) => s.loadLesson);
  const pushProgress = useLessonStore((s) => s.pushProgress);
  const markComplete = useLessonStore((s) => s.markComplete);
  const toggleFavourite = useLessonStore((s) => s.toggleFavourite);
  const resetCurrent = useLessonStore((s) => s.resetCurrent);
  const showToast = useUiStore((s) => s.showToast);
  const fontSize = useUiStore((s) => s.fontSize);
  const setFontSize = useUiStore((s) => s.setFontSize);
  const focusMode = useUiStore((s) => s.focusMode);
  const toggleFocus = useUiStore((s) => s.toggleFocus);

  const blockRefs = useRef(new Map());
  const [maxSeen, setMaxSeen] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadLesson(Number(id));
    return () => resetCurrent();
  }, [id, loadLesson, resetCurrent]);

  // IntersectionObserver: track furthest block seen, push progress on change.
  useEffect(() => {
    if (!lesson?.blocks?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let highest = maxSeen;
        for (const e of entries) {
          if (e.isIntersecting) {
            const pos = Number(e.target.getAttribute('data-block-position') || 0);
            if (pos > highest) highest = pos;
          }
        }
        if (highest !== maxSeen) setMaxSeen(highest);
      },
      { threshold: 0.4 },
    );
    blockRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [lesson?.id, lesson?.blocks?.length, maxSeen]);

  // Debounced progress push (~5s) when maxSeen advances.
  useEffect(() => {
    if (!lesson || maxSeen <= 0) return;
    const t = setTimeout(() => {
      pushProgress({ lastBlockPosition: maxSeen, secondsSpent: 30 }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [maxSeen, lesson, pushProgress]);

  const isFavourite = lesson ? favouriteIds.has(lesson.id) : false;
  const lastBlock = useMemo(
    () => (lesson?.blocks?.length ? lesson.blocks[lesson.blocks.length - 1].position : 0),
    [lesson],
  );
  const reachedEnd = maxSeen >= lastBlock;
  const isCompleted = progress?.status === 'completed';

  async function handleComplete() {
    if (!lesson || completing) return;
    setCompleting(true);
    try {
      await markComplete();
      haptic('success');
      showToast('Сабақ оқылды!', 'success');
    } catch (e) {
      showToast(e.message || 'Қате', 'error');
    } finally {
      setCompleting(false);
    }
  }

  if (!lesson) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="animate-spin text-ink-muted" size={20} />
      </div>
    );
  }

  return (
    <article className={cn('pb-12', focusMode && 'pt-2')}>
      {!focusMode && (
        <div className="-mx-4 mb-4 flex items-center justify-between gap-2 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-1">
            <FontMenu size={fontSize} setSize={setFontSize} />
            <button
              type="button"
              onClick={toggleFocus}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink"
              aria-label="Фокус режимі"
            >
              <Maximize2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                toggleFavourite(lesson.id);
                haptic('select');
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition',
                isFavourite ? 'text-accent' : 'text-ink-muted hover:text-ink',
              )}
            >
              <Heart size={16} className={isFavourite ? 'fill-current' : ''} />
            </button>
          </div>
        </div>
      )}

      {focusMode && (
        <button
          type="button"
          onClick={toggleFocus}
          className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink"
        >
          <EyeOff size={12} />
          Фокустан шығу
        </button>
      )}

      <header className="container-reading space-y-3">
        <p className="label-eyebrow">
          {lesson.subject_code} ·{' '}
          {lesson.estimated_minutes ? `${lesson.estimated_minutes} мин оқу` : '—'}
        </p>
        <h1 className="font-serif text-[28px] leading-tight text-ink">
          {lesson.title_kk}
        </h1>
        {lesson.objective_kk && (
          <p className="text-[14px] text-ink-muted">
            <span className="text-ink-faint">Мақсаты:</span> {lesson.objective_kk}
          </p>
        )}
      </header>

      {progress && progress.last_block_position > 0 && !isCompleted && maxSeen === 0 && (
        <div className="container-reading mt-5">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3 text-[13px] text-ink-muted">
            Соңғы оқыған жерден жалғастыр — {progress.last_block_position + 1}-блок.
          </div>
        </div>
      )}

      {lesson.intro_kk && (
        <section className="container-reading mt-6">
          <p className="font-serif text-[17px] italic leading-relaxed text-ink-muted">
            {lesson.intro_kk}
          </p>
        </section>
      )}

      <section className="container-reading mt-8">
        <LessonBlocks
          blocks={lesson.blocks}
          registerBlockRef={(pos, el) => {
            if (el) blockRefs.current.set(pos, el);
            else blockRefs.current.delete(pos);
          }}
        />
      </section>

      {lesson.summary_kk && (
        <section className="container-reading mt-10">
          <div className="rounded-2xl border border-border bg-surface/50 p-5">
            <p className="label-eyebrow mb-2">қорытынды</p>
            <p className="font-serif text-[15px] leading-relaxed text-ink">
              {lesson.summary_kk}
            </p>
          </div>
        </section>
      )}

      {lesson.references?.length > 0 && (
        <section className="container-reading mt-8 space-y-2">
          <p className="label-eyebrow">сілтемелер</p>
          <ul className="space-y-1.5 text-[13px]">
            {lesson.references.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-soft underline-offset-2 hover:underline"
                >
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="container-reading mt-10">
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing || isCompleted}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-medium transition',
            isCompleted
              ? 'border border-success/30 bg-success/10 text-success'
              : reachedEnd
                ? 'bg-primary text-bg-deep hover:bg-primary-soft'
                : 'border border-border bg-surface/40 text-ink-muted',
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={16} />
              Оқылды
            </>
          ) : reachedEnd ? (
            <>
              <Sparkles size={16} />
              Сабақты аяқтадым
            </>
          ) : (
            <>
              <Eye size={14} />
              Соңына дейін оқып, белгіле
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function FontMenu({ size, setSize }) {
  const sizes = ['S', 'M', 'L'];
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface/40 p-0.5">
      <Type size={12} className="ml-1.5 text-ink-faint" />
      {sizes.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setSize(s)}
          className={cn(
            'h-7 w-7 rounded-full text-[11px] font-medium transition',
            size === s ? 'bg-primary/20 text-ink' : 'text-ink-faint hover:text-ink',
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
