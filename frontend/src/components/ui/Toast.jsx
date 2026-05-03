import { cn } from '../../lib/cn';
import { useUiStore } from '../../store/uiStore';

const tones = {
  default: 'bg-surface-2 text-ink shadow-soft',
  success:
    'bg-success/15 text-success border-success/40 shadow-[0_8px_30px_-12px_rgba(52,211,153,0.6)]',
  danger:
    'bg-danger/15 text-danger border-danger/40 shadow-[0_8px_30px_-12px_rgba(248,113,113,0.6)]',
  error:
    'bg-danger/15 text-danger border-danger/40 shadow-[0_8px_30px_-12px_rgba(248,113,113,0.6)]',
};

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className={cn(
          'pointer-events-auto rounded-full border border-border-strong px-4 py-2 text-[13px] animate-fade-up',
          tones[toast.tone] ?? tones.default,
        )}
      >
        {toast.message}
      </div>
    </div>
  );
}
