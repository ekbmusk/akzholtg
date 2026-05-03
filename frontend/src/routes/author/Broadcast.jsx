import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { broadcast, listAllLessons } from '../../api/author';
import { useUiStore } from '../../store/uiStore';

export default function Broadcast() {
  const [text, setText] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [sending, setSending] = useState(false);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    listAllLessons().then(setLessons).catch(() => {});
  }, []);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await broadcast({
        text,
        lesson_id: lessonId ? Number(lessonId) : null,
      });
      showToast(`${res.queued} оқушыға жіберіліп жатыр`, 'success');
      setText('');
    } catch (e) {
      showToast(e.message || 'Қате', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5 pt-4">
      <header className="space-y-2">
        <p className="label-eyebrow">хабарлама</p>
        <h1 className="font-serif text-[22px] leading-tight text-ink">
          Оқушыларға хабар жіберу
        </h1>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-surface/50 p-4">
        <label className="block space-y-1">
          <span className="label-eyebrow">мәтін</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-bg/40 p-3 text-[14px] text-ink focus:border-primary/50 focus:outline-none"
            placeholder="Жаңа жоба шықты — танысып көріңдер!"
          />
        </label>
        <label className="block space-y-1">
          <span className="label-eyebrow">жоба (қосымша)</span>
          <select
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg/40 p-2.5 text-[13px] text-ink focus:border-primary/50 focus:outline-none"
          >
            <option value="">— тіркемей жіберу —</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title_kk}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-[14px] font-medium text-bg-deep hover:bg-primary-soft disabled:opacity-60"
        >
          <Send size={14} />
          {sending ? 'Жіберіліп жатыр…' : 'Жіберу'}
        </button>
      </section>
    </div>
  );
}
