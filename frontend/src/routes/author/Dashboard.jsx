import { BookOpen, CheckCircle2, Eye, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getStats } from '../../api/author';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6 pt-4">
      <header className="space-y-2">
        <p className="label-eyebrow">автор / шолу</p>
        <h1 className="font-serif text-[24px] leading-tight text-ink">
          Кітапхана статистикасы
        </h1>
      </header>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          icon={BookOpen}
          label="Сабақтар"
          value={stats ? stats.published_lessons : '—'}
          sub={stats ? `барлығы ${stats.total_lessons}` : ''}
        />
        <StatTile
          icon={Eye}
          label="Қаралымдар"
          value={stats ? stats.total_views : '—'}
        />
        <StatTile
          icon={CheckCircle2}
          label="Аяқталған"
          value={stats ? stats.total_completions : '—'}
        />
        <StatTile
          icon={Heart}
          label="Таңдаулыға"
          value={stats ? stats.total_favourites : '—'}
        />
      </div>

      <section className="space-y-3">
        <p className="label-eyebrow">үздіктер</p>
        <div className="rounded-2xl border border-border bg-surface/50">
          {stats?.top_lessons?.length ? (
            <ul className="divide-y divide-border">
              {stats.top_lessons.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    to={`/author/lessons/${l.id}/edit`}
                    className="line-clamp-1 text-[14px] text-ink hover:text-primary-soft"
                  >
                    {l.title_kk}
                  </Link>
                  <span className="font-mono text-[12px] tabular-nums text-ink-muted">
                    {l.views}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-[13px] text-ink-muted">
              Әзірге деректер жоқ.
            </p>
          )}
        </div>
      </section>

      <Link
        to="/author/lessons/new"
        className="block rounded-2xl bg-primary py-3 text-center text-[14px] font-medium text-bg-deep hover:bg-primary-soft"
      >
        Жаңа сабақ жасау
      </Link>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-4">
      <Icon size={16} className="mb-2 text-primary-soft" />
      <p className="font-serif text-[24px] tabular-nums text-ink">{value}</p>
      <p className="text-[12px] text-ink-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-ink-faint">{sub}</p>}
    </div>
  );
}
