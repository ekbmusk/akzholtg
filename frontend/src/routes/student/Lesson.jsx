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
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';
import { useReducedMotion } from '../../lib/animation';
import { resolveImageUrl } from '../../lib/imageUrl';
import { cn } from '../../lib/cn';
import { extractLabMeta } from '../../lib/labMeta';
import { haptic } from '../../lib/telegram';
import { useLessonStore } from '../../store/lessonStore';
import { useUiStore } from '../../store/uiStore';

const SWIPE_HINT_KEY = 'lab_swipe_hint_seen';

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
      <div className="container-reading space-y-4 pt-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <SkeletonCard />
        <SkeletonCard />
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
  const focusMode = useUiStore((s) => s.focusMode);
  const reducedMotion = useReducedMotion();

  const blocks = lesson.blocks || [];
  const totalSteps = blocks.length + 1; // +1 = final summary screen

  const startStep = Math.min(progress?.last_block_position || 0, blocks.length);
  const [step, setStep] = useState(startStep);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back
  const [started, setStarted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(
    () =>
      typeof window !== 'undefined' &&
      !window.localStorage.getItem(SWIPE_HINT_KEY),
  );
  const meta = useMemo(() => extractLabMeta(blocks), [blocks]);

  // Re-sync if a fresh progress payload arrives after first render.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current && progress?.last_block_position !== undefined) {
      synced.current = true;
      setStep(Math.min(progress.last_block_position, blocks.length));
    }
  }, [progress?.last_block_position, blocks.length]);

  const dismissSwipeHint = () => {
    if (!showSwipeHint) return;
    setShowSwipeHint(false);
    try {
      window.localStorage.setItem(SWIPE_HINT_KEY, '1');
    } catch {
      /* SSR / private mode — no-op */
    }
  };

  const goNext = () => {
    if (step >= totalSteps - 1) return;
    setDir(1);
    setStep(step + 1);
    haptic('light');
    dismissSwipeHint();
    // Persist the position the student reached. Cap at last real block.
    pushProgress({
      lastBlockPosition: Math.min(step + 1, Math.max(blocks.length - 1, 0)),
      secondsSpent: 30,
    }).catch(() => {});
  };

  const goPrev = () => {
    if (step <= 0) return;
    setDir(-1);
    setStep(step - 1);
    haptic('light');
    dismissSwipeHint();
  };

  // Touch-driven swipe nav. Mobile-only — no pointer/mouse parity needed
  // inside Telegram WebView. Axis-locks so vertical scroll never triggers
  // a step change.
  const touchStart = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (Date.now() - start.t > 600) return; // ignore lazy gestures
    if (dx < 0) goNext();
    else goPrev();
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

  // Landing screen: shown until the student presses Бастау / Жалғастыру.
  // Skips automatically if the lesson has no extra meta to display.
  if (!started) {
    return (
      <LabLanding
        lesson={lesson}
        meta={meta}
        progressStep={progress?.last_block_position || 0}
        totalSteps={totalSteps}
        isCompleted={isCompleted}
        onStart={() => {
          setStarted(true);
          haptic('medium');
        }}
      />
    );
  }

  return (
    <div
      className={cn('container-reading', focusMode && 'mx-auto max-w-[680px]')}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="mb-4 space-y-3">
        <p className="label-eyebrow">
          {lesson.subject_code} · зертханалық жұмыс
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-ink">
          {lesson.title_kk}
        </h1>
      </header>

      <StepProgress step={step} total={totalSteps} />

      {showSwipeHint && step === 0 && (
        <p className="mt-2 animate-fade-in text-[11px] text-ink-faint">
          Сипап ауыстыруға болады →
        </p>
      )}

      <section
        key={step}
        className={cn(
          'mt-6 min-h-[220px]',
          !reducedMotion &&
            (dir === 1 ? 'animate-slide-from-right' : 'animate-slide-from-left'),
          reducedMotion && 'animate-fade-in',
        )}
      >
        {isFinalScreen ? (
          <FinalScreen lesson={lesson} />
        ) : (
          <LessonBlock block={currentBlock} />
        )}
      </section>

      <nav className="sticky bottom-3 z-10 mt-8 flex items-center justify-between gap-3 rounded-full border border-border bg-bg/85 px-2 py-2 backdrop-blur-md">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] transition',
            step === 0
              ? 'cursor-not-allowed text-ink-faint opacity-40'
              : 'text-ink hover:bg-surface',
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

function LabLanding({
  lesson,
  meta,
  progressStep,
  totalSteps,
  isCompleted,
  onStart,
}) {
  const resuming = progressStep > 0 && !isCompleted;
  const grade = meta.passport.find((p) => p.label === 'Сыныбы')?.value;
  const section = meta.passport.find((p) => p.label === 'Бөлім')?.value;
  const duration = meta.passport.find((p) => p.label === 'Уақыты')?.value;
  const projectType = meta.passport.find((p) => p.label === 'Жоба түрі')?.value;

  return (
    <div className="container-reading space-y-6">
      <header className="space-y-3">
        <p className="label-eyebrow">
          {lesson.subject_code} · зертханалық жұмыс
        </p>
        <h1 className="font-serif text-[26px] leading-tight text-ink">
          {lesson.title_kk}
        </h1>
        {lesson.cover_image_url && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface/40">
            <img
              src={resolveImageUrl(lesson.cover_image_url)}
              alt=""
              className="block w-full"
            />
          </div>
        )}
      </header>

      {(grade || section || duration || projectType) && (
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          {grade && (
            <MetaPill label="Сыныбы" value={grade} />
          )}
          {duration && (
            <MetaPill label="Уақыты" value={duration} />
          )}
          {section && (
            <MetaPill label="Бөлім" value={section} className="col-span-2" />
          )}
          {projectType && (
            <MetaPill label="Жоба түрі" value={projectType} className="col-span-2" />
          )}
        </div>
      )}

      {lesson.overview_kk && (
        <section className="rounded-2xl border border-primary/30 bg-primary/[0.07] p-5">
          <p className="label-eyebrow mb-2 text-primary-soft">
            Бұл сабақта сен не істейсің?
          </p>
          <p className="font-serif text-[15.5px] leading-relaxed text-ink">
            {lesson.overview_kk}
          </p>
        </section>
      )}

      {lesson.objective_kk && (
        <Section title="Мақсаты">
          <p className="font-serif text-[15px] leading-relaxed text-ink">
            {lesson.objective_kk}
          </p>
        </Section>
      )}

      {lesson.intro_kk && (
        <Section title="Не үшін бұл қызық?">
          <p className="font-serif text-[15px] italic leading-relaxed text-ink-muted">
            {lesson.intro_kk}
          </p>
        </Section>
      )}

      {meta.questions.length > 0 && (
        <Section title="Біз қандай сұрақтарға жауап іздейміз?">
          <ul className="space-y-1.5 text-[13.5px] text-ink">
            {meta.questions.slice(0, 4).map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-ink-faint">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {meta.stages.length > 0 && (
        <Section title="Сабақта не істейміз?">
          <ol className="space-y-2 text-[13.5px] text-ink">
            {meta.stages.map((stage, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-medium text-primary-soft">
                  {i + 1}
                </span>
                <span>{stage}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {meta.equipment.length > 0 && (
        <Section title="Не керек болады?">
          <ul className="grid grid-cols-1 gap-1.5 text-[13.5px] text-ink sm:grid-cols-2">
            {meta.equipment.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-ink-faint">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {lesson.summary_kk && (
        <Section title="Сабақ соңында не білеміз?">
          <p className="font-serif text-[14px] leading-relaxed text-ink-muted">
            {lesson.summary_kk}
          </p>
        </Section>
      )}

      <div className="sticky bottom-3 pt-2">
        <button
          type="button"
          onClick={onStart}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[14px] font-medium transition',
            isCompleted
              ? 'border border-success/30 bg-success/10 text-success'
              : 'bg-primary text-bg-deep shadow-lg shadow-primary/20 hover:bg-primary-soft',
          )}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={16} />
              Қайта қарау
            </>
          ) : resuming ? (
            <>
              <ArrowRight size={16} />
              {progressStep + 1}-қадамнан жалғастыру
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Бастау · {totalSteps} қадам
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MetaPill({ label, value, className }) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-2 rounded-2xl border border-border bg-surface/50 px-3.5 py-2.5',
        className,
      )}
    >
      <span className="text-[10px] uppercase tracking-ticker text-ink-faint">
        {label}
      </span>
      <span className="text-right text-[13px] text-ink">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <p className="label-eyebrow">{title}</p>
      {children}
    </section>
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
