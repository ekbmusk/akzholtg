import { HelpCircle, Quote } from 'lucide-react';

import { resolveImageUrl } from '../lib/imageUrl';
import { FormulaRenderer } from './FormulaRenderer';
import { VideoPlayer } from './VideoPlayer';

function TextBlock({ payload }) {
  const text = payload.text_kk || '';
  const paras = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="lesson-prose space-y-[1.1em]">
      {paras.map((p, i) => (
        <FormulaRenderer key={i} className="lesson-prose-line">{p}</FormulaRenderer>
      ))}
    </div>
  );
}

function FormulaBlock({ payload }) {
  return (
    <figure className="my-2 rounded-2xl border border-border bg-surface/60 p-5 text-center">
      <div className="overflow-x-auto">
        <FormulaRenderer>{`$$${payload.latex || ''}$$`}</FormulaRenderer>
      </div>
      {payload.caption_kk && (
        <figcaption className="mt-3 text-[12px] text-ink-muted">
          {payload.caption_kk}
        </figcaption>
      )}
    </figure>
  );
}

function ImageBlock({ payload }) {
  if (!payload.url) return null;
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-surface/40">
      <img
        src={resolveImageUrl(payload.url)}
        alt={payload.alt_kk || payload.caption_kk || ''}
        className="block w-full"
        loading="lazy"
      />
      {payload.caption_kk && (
        <figcaption className="px-4 py-3 text-[12px] text-ink-muted">
          {payload.caption_kk}
        </figcaption>
      )}
    </figure>
  );
}

function VideoBlock({ payload }) {
  return (
    <VideoPlayer
      video={{
        provider: payload.provider || 'youtube',
        external_id_or_url: payload.external_id_or_url,
        title_kk: payload.title_kk,
      }}
    />
  );
}

function FactBlock({ payload }) {
  return (
    <aside className="fact-callout flex gap-3">
      <span className="text-[18px] leading-none">{payload.icon || '💡'}</span>
      <span>{payload.text_kk}</span>
    </aside>
  );
}

function QuoteBlock({ payload }) {
  return (
    <blockquote className="quote-block">
      <Quote size={16} className="mb-2 text-primary/70" />
      <p className="font-serif text-[16px] leading-relaxed">{payload.text_kk}</p>
      {payload.author_kk && (
        <p className="mt-2 text-[12px] not-italic text-ink-faint">
          — {payload.author_kk}
        </p>
      )}
    </blockquote>
  );
}

function DividerBlock() {
  return (
    <div className="my-6 flex items-center justify-center">
      <span className="text-ink-faint">· · ·</span>
    </div>
  );
}

function QuestionBlock({ payload }) {
  const items = Array.isArray(payload.questions_kk)
    ? payload.questions_kk.filter((q) => typeof q === 'string' && q.trim())
    : [];
  if (!items.length) return null;
  const title = payload.title_kk?.trim() || 'Ойлан';
  return (
    <aside className="question-block">
      <header className="mb-3 flex items-center gap-2 text-primary">
        <HelpCircle size={16} />
        <span className="text-[12px] font-medium uppercase tracking-ticker">
          {title}
        </span>
      </header>
      <ol className="list-decimal space-y-2 pl-5 marker:text-primary/70">
        {items.map((q, i) => (
          <li key={i} className="text-ink">{q}</li>
        ))}
      </ol>
    </aside>
  );
}

const RENDERERS = {
  text: TextBlock,
  formula: FormulaBlock,
  image: ImageBlock,
  video: VideoBlock,
  fact: FactBlock,
  quote: QuoteBlock,
  divider: DividerBlock,
  question: QuestionBlock,
};

export function LessonBlock({ block, registerRef }) {
  const Renderer = RENDERERS[block.type];
  if (!Renderer) return null;
  return (
    <div ref={registerRef} data-block-position={block.position}>
      <Renderer payload={block.payload || {}} />
    </div>
  );
}

export function LessonBlocks({ blocks, registerBlockRef }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-6">
      {blocks.map((b) => (
        <LessonBlock
          key={b.id ?? `${b.type}-${b.position}`}
          block={b}
          registerRef={registerBlockRef ? (el) => registerBlockRef(b.position, el) : undefined}
        />
      ))}
    </div>
  );
}
