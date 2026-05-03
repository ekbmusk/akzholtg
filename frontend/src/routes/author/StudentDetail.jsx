import { ArrowLeft, CheckCircle2, Clock, Heart, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getStudent } from '../../api/author';
import { cn } from '../../lib/cn';
import { resolveImageUrl } from '../../lib/imageUrl';

const SUBJECT_LABEL = {
  physics: 'Физика',
  chemistry: 'Химия',
  biology: 'Биология',
  mathematics: 'Математика',
  informatics: 'Информатика',
  engineering: 'Инженерия',
  astronomy: 'Астрономия',
  ecology: 'Экология',
  interdisciplinary: 'Пәнаралық',
};

function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('kk-KZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0} сек`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return `${h} сағ ${m % 60} мин`;
}

export default function StudentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStudent(Number(id))
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
          to="/author/students"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow">оқушы</p>
          <h1 className="line-clamp-1 font-serif text-[20px] leading-tight text-ink">
            {data
              ? [data.first_name, data.last_name].filter(Boolean).join(' ') ||
                (data.username ? `@${data.username}` : `tg:${data.telegram_id}`)
              : '…'}
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
      ) : data ? (
        <>
          <ProfileCard student={data} />
          <ProgressList progress={data.progress} />
          <FavouritesList favourites={data.favourites} />
        </>
      ) : null}
    </div>
  );
}

function ProfileCard({ student }) {
  const handle = student.username
    ? `@${student.username}`
    : `tg:${student.telegram_id ?? '—'}`;
  const initials = (student.first_name || handle).slice(0, 2).toUpperCase();

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface/50 p-4">
      {student.photo_url ? (
        <img
          src={resolveImageUrl(student.photo_url)}
          alt=""
          className="h-14 w-14 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-bg-deep text-[16px] text-ink-muted">
          {initials}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[11px] text-ink-faint">{handle}</p>
        <div className="flex flex-wrap gap-3 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            ашты {student.lessons_opened}
          </span>
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 size={12} />
            аяқтады {student.lessons_completed}
          </span>
          {student.favourites?.length > 0 && (
            <span className="inline-flex items-center gap-1 text-accent">
              <Heart size={12} />
              {student.favourites.length}
            </span>
          )}
        </div>
        {student.created_at && (
          <p className="text-[11px] text-ink-faint">
            Тіркелді: {formatDate(student.created_at)}
          </p>
        )}
      </div>
    </section>
  );
}

function ProgressList({ progress }) {
  if (!progress?.length) {
    return (
      <section className="space-y-2">
        <p className="label-eyebrow">жобалардағы прогресс</p>
        <p className="rounded-2xl border border-border bg-surface/40 p-5 text-center text-[13px] text-ink-muted">
          Әлі бір жоба ашылмаған.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <p className="label-eyebrow">жобалардағы прогресс · {progress.length}</p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/50">
        {progress.map((p) => (
          <ProgressRow key={p.lesson_id} progress={p} />
        ))}
      </ul>
    </section>
  );
}

function ProgressRow({ progress }) {
  const stepsDone = Math.min(
    progress.last_block_position + 1,
    progress.total_blocks || progress.last_block_position + 1,
  );
  const total = progress.total_blocks || stepsDone;
  const pct = total > 0 ? Math.round((stepsDone / total) * 100) : 0;
  const completed = progress.status === 'completed';
  const inProgress = progress.status === 'in_progress';

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          to={`/author/lessons/${progress.lesson_id}/progress`}
          className="line-clamp-1 text-[13.5px] text-ink hover:text-primary-soft"
        >
          {progress.title_kk}
        </Link>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-ticker',
            completed
              ? 'bg-success/15 text-success'
              : inProgress
                ? 'bg-primary/15 text-primary-soft'
                : 'bg-bg-deep text-ink-faint',
          )}
        >
          {completed ? 'бітті' : inProgress ? 'жұмыста' : 'ашты'}
        </span>
      </div>
      <div className="flex items-center gap-2">
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
      <div className="flex items-center justify-between text-[10.5px] text-ink-faint">
        <span>{SUBJECT_LABEL[progress.subject_code] || progress.subject_code}</span>
        <span>
          {formatDuration(progress.seconds_spent)} · {formatDate(progress.updated_at)}
        </span>
      </div>
    </li>
  );
}

function FavouritesList({ favourites }) {
  if (!favourites?.length) return null;
  return (
    <section className="space-y-2">
      <p className="label-eyebrow">таңдаулылары · {favourites.length}</p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/50">
        {favourites.map((f) => (
          <li key={f.lesson_id} className="flex items-center gap-3 px-4 py-3">
            <Heart size={14} className="shrink-0 text-accent" />
            <Link
              to={`/author/lessons/${f.lesson_id}/edit`}
              className="line-clamp-1 flex-1 text-[13.5px] text-ink hover:text-primary-soft"
            >
              {f.title_kk}
            </Link>
            <span className="text-[10.5px] text-ink-faint">
              {SUBJECT_LABEL[f.subject_code] || f.subject_code}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
