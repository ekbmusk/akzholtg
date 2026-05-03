/**
 * Share helpers — produce Telegram share-dialog links that the receiver can
 * forward to any chat. The shared message links back to the bot so the friend
 * can open the Mini App with one tap.
 */
import { openTelegram } from './telegram';

const BOT_USERNAME =
  import.meta.env.VITE_BOT_USERNAME || 'kazakhzerthana_bot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

function tgShareUrl(text) {
  // Telegram's share dialog reads `url` as the link preview anchor and `text`
  // as the message body. Including the link in `url` makes it the rich
  // preview; we still drop the bare URL in the text for plain-text fallback.
  const params = new URLSearchParams({ url: BOT_LINK, text });
  return `https://t.me/share/url?${params.toString()}`;
}

export function shareAchievements(badges) {
  const earned = (badges ?? []).filter((b) => b.state?.earned);
  if (!earned.length) return false;

  const lines = [
    `Мен жобалық оқыту қолданбасында ${earned.length} жетістікке жеттім:`,
    ...earned.slice(0, 6).map((b) => `• ${b.kk}`),
  ];
  if (earned.length > 6) lines.push(`...және тағы ${earned.length - 6}`);
  lines.push('', `Сен де көріп көр: ${BOT_LINK}`);

  openTelegram(tgShareUrl(lines.join('\n')));
  return true;
}

export function shareSingleBadge(badge) {
  if (!badge) return false;
  const text = [
    `Мен жобалық оқыту қолданбасында «${badge.kk}» жетістігін алдым.`,
    `Сен де ботты ашып көр: ${BOT_LINK}`,
  ].join('\n');
  openTelegram(tgShareUrl(text));
  return true;
}

export { BOT_LINK, BOT_USERNAME };
