// Lab lesson blocks store text in `"<heading>\n\n<body>"` form. These
// helpers pull out specific sections so the landing screen can show a
// real preview ("what we'll do today") instead of a flat block list.

const PASSPORT_HEADING = 'Жоба паспорты';
const STAGES_HEADING = 'Жобаның кезеңдері';
const EQUIPMENT_HEADING = 'Қажетті жабдықтар';
const QUESTIONS_HEADING = 'Зерттеу сұрақтары';

function findText(blocks, heading) {
  const match = (blocks || []).find(
    (b) =>
      b.type === 'text' &&
      typeof b.payload?.text_kk === 'string' &&
      b.payload.text_kk.trim().startsWith(heading),
  );
  if (!match) return null;
  const [, ...rest] = match.payload.text_kk.split('\n\n');
  return rest.join('\n\n').trim() || null;
}

function findHypothesis(blocks) {
  // Hypothesis is a `quote` block emitted by the seed builder.
  const q = (blocks || []).find((b) => b.type === 'quote');
  return q?.payload?.text_kk || null;
}

function parsePassport(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const dash = line.indexOf('—');
      if (dash === -1) return null;
      return {
        label: line.slice(0, dash).trim(),
        value: line.slice(dash + 1).trim(),
      };
    })
    .filter(Boolean);
}

function parseList(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, ''));
}

export function extractLabMeta(blocks) {
  const passportText = findText(blocks, PASSPORT_HEADING);
  return {
    passport: parsePassport(passportText),
    hypothesis: findHypothesis(blocks),
    stages: parseList(findText(blocks, STAGES_HEADING)),
    equipment: parseList(findText(blocks, EQUIPMENT_HEADING)),
    questions: parseList(findText(blocks, QUESTIONS_HEADING)),
  };
}
