import { Eye, EyeOff, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  deleteLesson,
  listAllLessons,
  publishLesson,
  unpublishLesson,
} from '../../api/author';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

export default function LessonList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((s) => s.showToast);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listAllLessons());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function togglePublished(item) {
    try {
      // Note: server flips is_published; we re-derive from response.
      if (item.published_at) {
        await unpublishLesson(item.id);
      } else {
        await publishLesson(item.id);
      }
      showToast('Күй жаңартылды', 'success');
      refresh();
    } catch (e) {
      showToast(e.message || 'Қате', 'error');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Сабақты өшіру керек пе?')) return;
    try {
      await deleteLesson(id);
      showToast('Өшірілді', 'success');
      refresh();
    } catch (e) {
      showToast(e.message || 'Қате', 'error');
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="label-eyebrow">сабақтар</p>
          <h1 className="font-serif text-[22px] leading-tight text-ink">
            Барлық сабақтар
          </h1>
        </div>
        <Link
          to="/author/lessons/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[13px] font-medium text-bg-deep hover:bg-primary-soft"
        >
          <Plus size={14} />
          Жаңа
        </Link>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface/40 p-6 text-center text-[13px] text-ink-muted">
          Әлі бір сабақ жоқ. Жаңа сабақ жасап көр.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/50">
          {items.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 px-3 py-3"
            >
              <div className="flex-1 min-w-0">
                <Link
                  to={`/author/lessons/${l.id}/edit`}
                  className="line-clamp-1 text-[14px] text-ink hover:text-primary-soft"
                >
                  {l.title_kk}
                </Link>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {l.subject_code} · {l.difficulty}
                  {l.estimated_minutes ? ` · ${l.estimated_minutes} мин` : ''}
                </p>
              </div>
              <Link
                to={`/author/lessons/${l.id}/progress`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition hover:text-ink"
                title="Оқушылар прогресі"
              >
                <Users size={14} />
              </Link>
              <button
                type="button"
                onClick={() => togglePublished(l)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition',
                  l.published_at
                    ? 'bg-success/15 text-success'
                    : 'text-ink-faint hover:text-ink',
                )}
                title={l.published_at ? 'Жариядан алу' : 'Жариялау'}
              >
                {l.published_at ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(l.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:text-danger"
                title="Өшіру"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
