import { Clock, Heart, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listStudents } from '../../api/author';
import { resolveImageUrl } from '../../lib/imageUrl';

function formatRelative(isoStr) {
  if (!isoStr) return null;
  const then = new Date(isoStr);
  const diffMs = Date.now() - then.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'қазір';
  if (min < 60) return `${min} мин бұрын`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} сағ бұрын`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} күн бұрын`;
  return then.toLocaleDateString('kk-KZ');
}

export default function Students() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    listStudents()
      .then((data) => alive && setItems(data))
      .catch((e) => alive && setError(e.message || 'Қате'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-5 pt-4">
      <header className="space-y-2">
        <p className="label-eyebrow">оқушылар</p>
        <h1 className="font-serif text-[22px] leading-tight text-ink">
          Барлық оқушылар
          {!loading && items.length > 0 && (
            <span className="ml-2 text-ink-faint">· {items.length}</span>
          )}
        </h1>
      </header>

      {loading ? (
        <div className="flex justify-center pt-6">
          <Loader2 className="animate-spin text-ink-muted" size={20} />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/[0.07] p-4 text-[13px] text-danger">
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center">
          <Users size={20} className="mx-auto mb-3 text-ink-faint" />
          <p className="text-[13px] text-ink-muted">
            Әлі бірде-бір оқушы тіркелмеген.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/50">
          {items.map((s) => (
            <StudentRow key={s.user_id} student={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentRow({ student }) {
  const name = [student.first_name, student.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const handle = student.username
    ? `@${student.username}`
    : `tg:${student.telegram_id ?? '—'}`;
  const last = formatRelative(student.last_seen);

  return (
    <li>
      <Link
        to={`/author/students/${student.user_id}`}
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface"
      >
        <Avatar url={student.photo_url} fallback={name || handle} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[14px] text-ink">
            {name || handle}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-faint">
            {handle}
            {last && ` · ${last}`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {student.lessons_opened}
          </span>
          <span className="inline-flex items-center gap-1 text-success">
            ✓ {student.lessons_completed}
          </span>
          {student.favourites_count > 0 && (
            <span className="inline-flex items-center gap-1 text-accent">
              <Heart size={11} />
              {student.favourites_count}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function Avatar({ url, fallback }) {
  const initials = (fallback || '?').slice(0, 2).toUpperCase();
  if (url) {
    return (
      <img
        src={resolveImageUrl(url)}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-deep text-[13px] text-ink-muted">
      {initials}
    </span>
  );
}
