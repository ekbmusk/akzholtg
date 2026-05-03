import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getLessonProgress } from '../../api/author';
import { cn } from '../../lib/cn';

export default function LessonProgress() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    getLessonProgress(Number(id))
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || 'Қате'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="space-y-5 pt-4">
      <header className="flex items-center gap-3">
        <Link
          to="/author/lessons"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow">оқушылар прогресі</p>
          <h1 className="line-clamp-1 font-serif text-[20px] leading-tight text-ink">
            {data?.title_kk || '—'}
          </h1>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center pt-6">
          <Loader2 className="animate-spin text-ink-muted" size={20} />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/[0.07] p-4 text-[13px] text-danger">
          {error}
        </p>
      ) : data?.students?.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface/40 p-6 text-center text-[13px] text-ink-muted">
          Әлі бір оқушы жұмысты ашпаған.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/50">
          {data?.students?.map((s) => (
            <ProgressRow
              key={s.user_id}
              student={s}
              total={data.total_blocks}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressRow({ student, total }) {
  const fullName = [student.first_name, student.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const handle = student.username
    ? `@${student.username}`
    : `tg:${student.telegram_id ?? '—'}`;

  // last_block_position is 0-indexed; +1 to read as "step N completed".
  const stepsDone = Math.min(student.last_block_position + 1, total);
  const pct = total > 0 ? Math.round((stepsDone / total) * 100) : 0;
  const completed = student.status === 'completed';
  const inProgress = student.status === 'in_progress';

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-deep text-[13px] text-ink-muted">
        {(fullName || handle || '?').slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13.5px] text-ink">
          {fullName || handle}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-deep">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                completed ? 'bg-success' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-faint">
            {stepsDone}/{total}
          </span>
        </div>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] uppercase tracking-ticker',
          completed
            ? 'bg-success/15 text-success'
            : inProgress
              ? 'bg-primary/15 text-primary-soft'
              : 'bg-bg-deep text-ink-faint',
        )}
      >
        {completed ? (
          <>
            <CheckCircle2 size={10} />
            бітті
          </>
        ) : inProgress ? (
          'жұмыста'
        ) : (
          'ашты'
        )}
      </span>
    </li>
  );
}
