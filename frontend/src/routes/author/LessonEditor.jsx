import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Quote,
  Save,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createLesson, updateLesson, uploadImages } from '../../api/author';
import { getLesson } from '../../api/lessons';
import { LessonBlock } from '../../components/LessonBlocks';
import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

const SUBJECT_OPTIONS = [
  { code: 'physics', label: 'Физика' },
  { code: 'chemistry', label: 'Химия' },
  { code: 'biology', label: 'Биология' },
  { code: 'mathematics', label: 'Математика' },
  { code: 'informatics', label: 'Информатика' },
  { code: 'engineering', label: 'Инженерия' },
  { code: 'astronomy', label: 'Астрономия' },
  { code: 'ecology', label: 'Экология' },
  { code: 'interdisciplinary', label: 'Пәнаралық' },
];

const BLOCK_TYPES = [
  { type: 'text', label: 'Мәтін', icon: Quote, default: { text_kk: '' } },
  { type: 'formula', label: 'Формула', icon: Sparkles, default: { latex: '', caption_kk: '' } },
  { type: 'image', label: 'Сурет', icon: ImageIcon, default: { url: '', caption_kk: '' } },
  { type: 'video', label: 'Видео', icon: Video, default: { provider: 'youtube', external_id_or_url: '', title_kk: '' } },
  { type: 'fact', label: 'Факт', icon: Sparkles, default: { text_kk: '', icon: '💡' } },
  { type: 'quote', label: 'Дәйексөз', icon: Quote, default: { text_kk: '', author_kk: '' } },
  { type: 'divider', label: 'Бөлгіш', icon: Sparkles, default: {} },
];

const EMPTY = {
  title_kk: '',
  subject_code: 'physics',
  difficulty: 'medium',
  age_range: '',
  summary_kk: '',
  intro_kk: '',
  objective_kk: '',
  cover_image_url: '',
  estimated_minutes: 5,
  is_featured: false,
  tags: [],
  references: [],
  blocks: [],
  videos: [],
};

export default function LessonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useUiStore((s) => s.showToast);

  const [lesson, setLesson] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const l = await getLesson(Number(id));
        setLesson({
          ...EMPTY,
          ...l,
          blocks: (l.blocks || []).map((b, i) => ({ ...b, position: i })),
          tags: l.tags || [],
          references: l.references || [],
        });
      } catch (e) {
        showToast(e.message || 'Жүктеу қатесі', 'error');
      }
    })();
  }, [id, showToast]);

  function patch(field, value) {
    setLesson((l) => ({ ...l, [field]: value }));
  }

  function addBlock(type) {
    const def = BLOCK_TYPES.find((b) => b.type === type);
    setLesson((l) => ({
      ...l,
      blocks: [
        ...l.blocks,
        { type, payload: { ...def.default }, position: l.blocks.length },
      ],
    }));
  }

  function patchBlock(idx, payload) {
    setLesson((l) => {
      const next = [...l.blocks];
      next[idx] = { ...next[idx], payload: { ...next[idx].payload, ...payload } };
      return { ...l, blocks: next };
    });
  }

  function removeBlock(idx) {
    setLesson((l) => ({
      ...l,
      blocks: l.blocks
        .filter((_, i) => i !== idx)
        .map((b, i) => ({ ...b, position: i })),
    }));
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    setLesson((l) => {
      const next = Array.from(l.blocks);
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return { ...l, blocks: next.map((b, i) => ({ ...b, position: i })) };
    });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    setLesson((l) => ({ ...l, tags: [...new Set([...l.tags, t])] }));
    setTagInput('');
  }

  async function save() {
    if (!lesson.title_kk.trim()) {
      showToast('Тақырып керек', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title_kk: lesson.title_kk,
        subject_code: lesson.subject_code,
        difficulty: lesson.difficulty,
        age_range: lesson.age_range || null,
        objective_kk: lesson.objective_kk || null,
        summary_kk: lesson.summary_kk || null,
        intro_kk: lesson.intro_kk || null,
        cover_image_url: lesson.cover_image_url || null,
        estimated_minutes: Number(lesson.estimated_minutes) || null,
        is_featured: !!lesson.is_featured,
        tags: lesson.tags,
        references: lesson.references,
        blocks: lesson.blocks.map((b, i) => ({
          type: b.type,
          payload: b.payload,
          position: i,
        })),
        videos: lesson.videos || [],
      };
      const saved = id
        ? await updateLesson(Number(id), payload)
        : await createLesson(payload);
      showToast('Сақталды', 'success');
      if (!id) navigate(`/author/lessons/${saved.id}/edit`, { replace: true });
    } catch (e) {
      showToast(e.message || 'Сақтау қатесі', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const [url] = await uploadImages([file]);
      patch('cover_image_url', url);
    } catch (err) {
      showToast(err.message || 'Жүктеу қатесі', 'error');
    }
  }

  return (
    <div className="space-y-5 pb-12 pt-3">
      <div className="-mx-4 flex items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-serif text-[16px] text-ink">
          {id ? 'Жобаны өзгерту' : 'Жаңа жоба'}
        </h1>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[13px] font-medium text-bg-deep hover:bg-primary-soft disabled:opacity-60"
        >
          <Save size={14} />
          Сақтау
        </button>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4">
        <Field label="Тақырыбы">
          <input
            value={lesson.title_kk}
            onChange={(e) => patch('title_kk', e.target.value)}
            className="form-input"
            placeholder="Жарық дегеніміз не?"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Пән">
            <select
              value={lesson.subject_code}
              onChange={(e) => patch('subject_code', e.target.value)}
              className="form-input"
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Деңгейі">
            <select
              value={lesson.difficulty}
              onChange={(e) => patch('difficulty', e.target.value)}
              className="form-input"
            >
              <option value="easy">Қарапайым</option>
              <option value="medium">Орташа</option>
              <option value="hard">Күрделі</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Жас">
            <input
              value={lesson.age_range}
              onChange={(e) => patch('age_range', e.target.value)}
              className="form-input"
              placeholder="12-14"
            />
          </Field>
          <Field label="Оқу уақыты (мин)">
            <input
              type="number"
              value={lesson.estimated_minutes}
              onChange={(e) => patch('estimated_minutes', e.target.value)}
              className="form-input"
            />
          </Field>
        </div>
        <Field label="Мақсаты">
          <textarea
            value={lesson.objective_kk}
            onChange={(e) => patch('objective_kk', e.target.value)}
            className="form-input min-h-[60px]"
            rows={2}
          />
        </Field>
        <Field label="Қысқаша сипаттама">
          <textarea
            value={lesson.summary_kk}
            onChange={(e) => patch('summary_kk', e.target.value)}
            className="form-input min-h-[60px]"
            rows={2}
          />
        </Field>
        <Field label="Кіріспе">
          <textarea
            value={lesson.intro_kk}
            onChange={(e) => patch('intro_kk', e.target.value)}
            className="form-input min-h-[80px]"
            rows={3}
          />
        </Field>
        <Field label="Мұқаба суреті">
          <div className="flex items-center gap-2">
            <input
              value={lesson.cover_image_url}
              onChange={(e) => patch('cover_image_url', e.target.value)}
              className="form-input flex-1"
              placeholder="/api/uploads/lesson-images/…"
            />
            <label className="cursor-pointer rounded-full border border-border bg-surface-2 px-3 py-2 text-[12px] text-ink-muted hover:text-ink">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
              Жүктеу
            </label>
          </div>
        </Field>
        <Field label="Тегтер">
          <div className="flex flex-wrap items-center gap-1.5">
            {lesson.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-ink-muted"
              >
                {t}
                <button
                  type="button"
                  onClick={() =>
                    patch('tags', lesson.tags.filter((x) => x !== t))
                  }
                  className="text-ink-faint hover:text-danger"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="+ тег"
              className="form-input flex-1 !py-1 text-[12px]"
            />
          </div>
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-ink-muted">
          <input
            type="checkbox"
            checked={!!lesson.is_featured}
            onChange={(e) => patch('is_featured', e.target.checked)}
          />
          Таңдамалыға шығару
        </label>
      </section>

      <section className="space-y-3">
        <p className="label-eyebrow">блоктар</p>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="blocks">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3"
              >
                {lesson.blocks.map((b, idx) => (
                  <Draggable key={idx} draggableId={`b-${idx}`} index={idx}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className="overflow-hidden rounded-2xl border border-border bg-surface/50"
                      >
                        <div className="flex items-center gap-2 border-b border-border bg-surface-2/40 px-3 py-2">
                          <span
                            {...prov.dragHandleProps}
                            className="cursor-grab text-ink-faint"
                          >
                            <GripVertical size={14} />
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-ticker text-ink-muted">
                            {b.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeBlock(idx)}
                            className="ml-auto text-ink-faint hover:text-danger"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="space-y-2 p-3">
                          <BlockEditor
                            block={b}
                            onChange={(payload) => patchBlock(idx, payload)}
                          />
                          <details className="text-[11px] text-ink-faint">
                            <summary className="cursor-pointer">Алдын-ала қарау</summary>
                            <div className="mt-2 rounded-xl border border-border bg-bg/40 p-3">
                              <LessonBlock block={b} />
                            </div>
                          </details>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="flex flex-wrap gap-1.5">
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/40 px-3 py-1.5 text-[12px] text-ink-muted hover:text-ink',
              )}
            >
              <Plus size={12} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <style>{`
        .form-input {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 8px 12px;
          width: 100%;
          color: #E2E8F0;
          font-size: 13px;
          outline: none;
        }
        .form-input:focus { border-color: rgba(20,184,166,0.5); }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="label-eyebrow">{label}</span>
      {children}
    </label>
  );
}

function BlockEditor({ block, onChange }) {
  const p = block.payload || {};
  switch (block.type) {
    case 'text':
      return (
        <textarea
          value={p.text_kk || ''}
          onChange={(e) => onChange({ text_kk: e.target.value })}
          className="form-input min-h-[100px]"
          rows={4}
          placeholder="Мәтін…"
        />
      );
    case 'formula':
      return (
        <>
          <input
            value={p.latex || ''}
            onChange={(e) => onChange({ latex: e.target.value })}
            className="form-input font-mono"
            placeholder="E = mc^2"
          />
          <input
            value={p.caption_kk || ''}
            onChange={(e) => onChange({ caption_kk: e.target.value })}
            className="form-input"
            placeholder="Сипаттама"
          />
        </>
      );
    case 'image':
      return (
        <>
          <input
            value={p.url || ''}
            onChange={(e) => onChange({ url: e.target.value })}
            className="form-input"
            placeholder="URL"
          />
          <input
            value={p.caption_kk || ''}
            onChange={(e) => onChange({ caption_kk: e.target.value })}
            className="form-input"
            placeholder="Сипаттама"
          />
        </>
      );
    case 'video':
      return (
        <>
          <select
            value={p.provider || 'youtube'}
            onChange={(e) => onChange({ provider: e.target.value })}
            className="form-input"
          >
            <option value="youtube">YouTube</option>
            <option value="mp4">MP4</option>
          </select>
          <input
            value={p.external_id_or_url || ''}
            onChange={(e) => onChange({ external_id_or_url: e.target.value })}
            className="form-input font-mono"
            placeholder={
              p.provider === 'mp4' ? 'https://…/video.mp4' : 'YouTube ID, мысалы: dQw4w9WgXcQ'
            }
          />
          <input
            value={p.title_kk || ''}
            onChange={(e) => onChange({ title_kk: e.target.value })}
            className="form-input"
            placeholder="Видео атауы"
          />
        </>
      );
    case 'fact':
      return (
        <>
          <input
            value={p.icon || '💡'}
            onChange={(e) => onChange({ icon: e.target.value })}
            className="form-input w-16"
          />
          <textarea
            value={p.text_kk || ''}
            onChange={(e) => onChange({ text_kk: e.target.value })}
            className="form-input min-h-[60px]"
            rows={2}
            placeholder="Қызықты факт…"
          />
        </>
      );
    case 'quote':
      return (
        <>
          <textarea
            value={p.text_kk || ''}
            onChange={(e) => onChange({ text_kk: e.target.value })}
            className="form-input min-h-[60px]"
            rows={2}
            placeholder="Дәйексөз мәтіні"
          />
          <input
            value={p.author_kk || ''}
            onChange={(e) => onChange({ author_kk: e.target.value })}
            className="form-input"
            placeholder="Авторы"
          />
        </>
      );
    case 'divider':
      return <p className="text-[12px] text-ink-faint">Бөлгіш — қосымша баптау жоқ.</p>;
    default:
      return null;
  }
}
