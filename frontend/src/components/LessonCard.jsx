import { Clock, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '../lib/cn';
import { resolveImageUrl } from '../lib/imageUrl';

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

const DIFFICULTY_LABEL = {
  easy: 'Қарапайым',
  medium: 'Орташа',
  hard: 'Күрделі',
};

export function LessonCard({ lesson, isFavourite, onToggleFavourite, status }) {
  return (
    <Link
      to={`/lesson/${lesson.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface/70 transition hover:border-border-strong hover:bg-surface"
    >
      {lesson.cover_image_url && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-bg-deep">
          <img
            src={resolveImageUrl(lesson.cover_image_url)}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'label-eyebrow',
              `text-${lesson.subject_code}`,
            )}
          >
            {SUBJECT_LABEL[lesson.subject_code] || lesson.subject_code}
          </span>
          <div className="flex items-center gap-2">
            {lesson.is_featured && (
              <Sparkles size={12} className="text-accent" />
            )}
            {status === 'completed' && (
              <span className="font-mono text-[10px] uppercase tracking-ticker text-success">
                оқылды
              </span>
            )}
            {status === 'in_progress' && (
              <span className="font-mono text-[10px] uppercase tracking-ticker text-warn">
                басталды
              </span>
            )}
          </div>
        </div>

        <h3 className="font-serif text-[18px] leading-snug text-ink">
          {lesson.title_kk}
        </h3>

        {lesson.summary_kk && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
            {lesson.summary_kk}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1 text-[12px] text-ink-faint">
          <div className="flex items-center gap-3">
            <span>{DIFFICULTY_LABEL[lesson.difficulty] || lesson.difficulty}</span>
            {lesson.estimated_minutes && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {lesson.estimated_minutes} мин
              </span>
            )}
          </div>
          {onToggleFavourite && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavourite(lesson.id);
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition',
                isFavourite
                  ? 'bg-accent/15 text-accent'
                  : 'text-ink-faint hover:text-ink',
              )}
              aria-label="Таңдаулыға қосу"
            >
              <Heart
                size={14}
                className={isFavourite ? 'fill-current' : ''}
              />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
