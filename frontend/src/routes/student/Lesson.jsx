import {
  ArrowLeft,
  ArrowRight,
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

import { LessonBlock, LessonBlocks } from '../../components/LessonBlocks';
import { resolveImageUrl } from '../../lib/imageUrl';
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

  useEffect(() => {
    loadLesson(Number(id));
    return () => resetCurrent();
  }, [id, loadLesson, resetCurrent]);

  if (!lesson) {
    return (
      <div className="flex justify-center pt-16">
        <Loader2 className="animate-spin text-ink-muted" size={20} />
      </div>
    );
  }

  const isFavourite = favouriteIds.has(lesson.id);
  const isCompleted = progress?.status === 'completed';
  const isLab = (lesson.tags || []).includes('lab');

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
            {!isLab && <FontMenu size={fontSize} setSize={setFontSize} />}
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

      {isLab ? (
        <LabWizard
          lesson={lesson}
          progress={progress}
          isCompleted={isCompleted}
          pushProgress={pushProgress}
          markComplete={markComplete}
          showToast={showToast}
        />
      ) : (
        <ScrollReader
          lesson={lesson}
          progress={progress}
          isCompleted={isCompleted}
          pushProgress={pushProgress}
          markComplete={markComplete}
          showToast={showToast}
        />
      )}
    </article>
  );
}

// ─── Lab wizard: one block per screen ────────────────────────────────────────

function LabWizard({
  lesson,
  progress,
  isCompleted,
  pushProgress,
  markComplete,
  showToast,
}) {
  const blocks = lesson.blocks || [];
  const totalSteps = blocks.length + 1; // +1 = final summary screen

  const startStep = Math.min(progress?.last_block_position || 0, blocks.length);
  const [step, setStep] = useState(startStep);
  const [completing, setCompleting] = useState(false);

  // Re-sync if a fresh progress payload arrives after first render.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current && progress?.last_block_position !== undefined) {
      synced.current = true;
      setStep(Math.min(progress.last_block_position, blocks.length));
    }
  }, [progress?.last_block_position, blocks.length]);

  const goNext = () => {
    const next = Math.min(step + 1, totalSteps - 1);
    setStep(next);
    haptic('light');
    // Persist the position the student reached. Cap at last real block.
    pushProgress({
      lastBlockPosition: Math.min(next, Math.max(blocks.length - 1, 0)),
      secondsSpent: 30,
    }).catch(() => {});
  };

  const goPrev = () => {
    setStep(Math.max(0, step - 1));
    haptic('light');
  };

  const handleComplete = async () => {
    if (completing || isCompleted) return;
    setCompleting(true);
    try {
      await markComplete();
      haptic('success');
      showToast('Жұмыс аяқталды!', 'success');
    } catch (e) {
      showToast(e.message || 'Қате', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const isFinalScreen = step >= blocks.length;
  const currentBlock = !isFinalScreen ? blocks[step] : null;

  return (
    <div className="container-reading">
      <header className="mb-4 space-y-3">
        <p className="label-eyebrow">
          {lesson.subject_code} · зертханалық жұмыс
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-ink">
          {lesson.title_kk}
        </h1>
        {lesson.cover_image_url && step === 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface/40">
            <img
              src={resolveImageUrl(lesson.cover_image_url)}
              alt=""
              className="block w-full"
            />
          </div>
        )}
        {step === 0 && lesson.objective_kk && (
          <p className="text-[14px] text-ink-muted">
            <span className="text-ink-faint">Мақсаты:</span>{' '}
            {lesson.objective_kk}
          </p>
        )}
        {step === 0 && lesson.intro_kk && (
          <p className="font-serif text-[15px] italic leading-relaxed text-ink-muted">
            {lesson.intro_kk}
          </p>
        )}
      </header>

      <StepProgress step={step} total={totalSteps} />

      <section className="mt-6 min-h-[220px]">
        {isFinalScreen ? (
          <FinalScreen lesson={lesson} />
        ) : (
          <LessonBlock block={currentBlock} />
        )}
      </section>

      <nav className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-4 py-2.5 text-[13px] transition',
            step === 0
              ? 'cursor-not-allowed opacity-40'
              : 'text-ink hover:border-border-strong hover:bg-surface',
          )}
        >
          <ArrowLeft size={14} />
          Артқа
        </button>

        {isFinalScreen ? (
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing || isCompleted}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium transition',
              isCompleted
                ? 'border border-success/30 bg-success/10 text-success'
                : 'bg-primary text-bg-deep hover:bg-primary-soft',
            )}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={16} />
                Аяқталды
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Жұмысты аяқтадым
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-bg-deep transition hover:bg-primary-soft"
          >
            Әрі қарай
            <ArrowRight size={14} />
          </button>
        )}
      </nav>
    </div>
  );
}

function StepProgress({ step, total }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-ticker text-ink-faint">
        <span>қадам</span>
        <span>
          {Math.min(step + 1, total)} / {total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${Math.round(((step + 1) / total) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function FinalScreen({ lesson }) {
  return (
    <div className="space-y-5">
      {lesson.summary_kk && (
        <div className="rounded-2xl border border-border bg-surface/50 p-5">
          <p className="label-eyebrow mb-2">күтілетін нәтиже</p>
          <p className="font-serif text-[15px] leading-relaxed text-ink">
            {lesson.summary_kk}
          </p>
        </div>
      )}
      {lesson.references?.length > 0 && (
        <div className="space-y-2">
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
        </div>
      )}
      <p className="text-[13px] text-ink-muted">
        Барлық кезеңдерден өттің. Жұмысты аяқтау үшін төменгі түймені бас.
      </p>
    </div>
  );
}

// ─── Default scroll reader (theory lessons) ──────────────────────────────────

function ScrollReader({
  lesson,
  progress,
  isCompleted,
  pushProgress,
  markComplete,
  showToast,
}) {
  const blockRefs = useRef(new Map());
  const [maxSeen, setMaxSeen] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!lesson?.blocks?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let highest = maxSeen;
        for (const e of entries) {
          if (e.isIntersecting) {
            const pos = Number(
              e.target.getAttribute('data-block-position') || 0,
            );
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

  useEffect(() => {
    if (!lesson || maxSeen <= 0) return;
    const t = setTimeout(() => {
      pushProgress({ lastBlockPosition: maxSeen, secondsSpent: 30 }).catch(
        () => {},
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [maxSeen, lesson, pushProgress]);

  const lastBlock = useMemo(
    () =>
      lesson?.blocks?.length
        ? lesson.blocks[lesson.blocks.length - 1].position
        : 0,
    [lesson],
  );
  const reachedEnd = maxSeen >= lastBlock;

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

  return (
    <>
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

      {progress &&
        progress.last_block_position > 0 &&
        !isCompleted &&
        maxSeen === 0 && (
          <div className="container-reading mt-5">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3 text-[13px] text-ink-muted">
              Соңғы оқыған жерден жалғастыр —{' '}
              {progress.last_block_position + 1}-блок.
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
    </>
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
