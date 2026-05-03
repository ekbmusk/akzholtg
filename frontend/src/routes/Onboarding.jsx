import { ArrowRight, BookOpen, Heart, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { useUserStore } from '../store/userStore';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Қазақша теория',
    text: 'STEM пәндері бойынша қысқа, түсінікті сабақтар.',
  },
  {
    icon: Sparkles,
    title: 'Формула, видео, факт',
    text: 'Әр сабақта KaTeX-формулалар, YouTube және «білдің бе?» каллаут­тары.',
  },
  {
    icon: Heart,
    title: 'Таңдаулыға сақта',
    text: 'Жүректі бас — кейін оңай қайта оралу үшін.',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const role = useUserStore((s) => s.role);

  function start() {
    localStorage.setItem('onboarding_completed', '1');
    navigate(role === 'author' ? '/author/dashboard' : '/library', {
      replace: true,
    });
  }

  return (
    <div className="atmosphere flex min-h-screen flex-col">
      <div className="container-app flex flex-1 flex-col pb-6 pt-12">
        <header className="mb-10 space-y-2">
          <p className="label-eyebrow">stem · theory</p>
          <h1 className="font-serif text-[34px] leading-[1.05] text-ink">
            STEM теориясы —<br />
            <span className="text-primary-soft">оқу күнделігің.</span>
          </h1>
          <p className="text-[14px] text-ink-muted">
            Физика, биология, химия — қысқа сабақтар, тек теория, тапсырмасыз.
          </p>
        </header>

        <ul className="space-y-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-4 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-soft">
                <Icon size={18} />
              </span>
              <div className="space-y-1">
                <h3 className="font-serif text-[15px] text-ink">{title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <Button
            onClick={start}
            size="lg"
            className="w-full"
          >
            Бастау
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
