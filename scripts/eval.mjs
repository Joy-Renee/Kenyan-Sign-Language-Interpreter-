// npm run eval  (needs .env with MODEL_API_KEY). 30 fixed sequences; gold intents were written by the assistant, REVIEW THEM.
import { mkdirSync, writeFileSync } from 'node:fs';
import { ruleInterpret } from '../public/shared/intent.js';
import { generateInterpretation, MODEL } from '../api/_lib/understand.js';

const SEQ = [
  ['send_money', 'me send money mother'], ['send_money', 'send money mother'], ['send_money', 'me give money mother'],
  ['send_money', 'me send money'], ['send_money', 'send money'], ['send_money', 'give money mother'], ['send_money', 'me money send mother'],
  ['ask_fee', 'how_much'], ['ask_fee', 'money how_much'], ['ask_fee', 'send money how_much'], ['ask_fee', 'me how_much'], ['ask_fee', 'how_much money mother'],
  ['confirm', 'yes'], ['confirm', 'yes yes'], ['deny', 'no'], ['deny', 'no no'],
  ['thank', 'thank_you'], ['thank', 'thank_you thank_you'], ['thank', 'me thank_you'],
  ['request_help', 'help'], ['request_help', 'help me'], ['request_help', 'me help'], ['request_help', 'help me help'],
  ['unclear', 'money'], ['unclear', 'mother'], ['unclear', 'me'], ['unclear', 'send'], ['unclear', 'give'], ['unclear', 'yes no'], ['unclear', 'mother yes'],
];

const rows = [];
for (const [gold, str] of SEQ) {
  const signs = str.split(' ');
  const t = Date.now();
  const m = await generateInterpretation(signs);
  rows.push({ gold, str, base: ruleInterpret(signs), m, ms: Date.now() - t });
  process.stdout.write(m.ok ? '.' : 'x');
}
console.log();

const N = rows.length, pct = (a, b) => `${Math.round((100 * a) / b)}% (${a}/${b})`;
const final = (r) => (r.m.ok ? r.m.result : r.base);
const unc = rows.filter((r) => r.gold === 'unclear');
const asked = (x) => x.intent === 'unclear' && x.clarifying_question;
const lat = rows.map((r) => r.ms).sort((a, b) => a - b);
const avg = (f) => Math.round(rows.reduce((a, r) => a + (f(r) ?? 0), 0) / N);
const stat = {
  firstOk: rows.filter((r) => r.m.firstTryOk).length, finalOk: rows.filter((r) => r.m.ok).length,
  mCorrect: rows.filter((r) => r.m.ok && r.m.result.intent === r.gold).length,
  e2e: rows.filter((r) => final(r).intent === r.gold).length,
  bCorrect: rows.filter((r) => r.base.intent === r.gold).length,
  mAsk: unc.filter((r) => r.m.ok && asked(r.m.result)).length, bAsk: unc.filter((r) => asked(r.base)).length,
};
const table = [
  `Eval: ${N} fixed sign sequences, model ${MODEL}, one run, effort ${process.env.META_REASONING_EFFORT ?? 'minimal'}.`,
  '',
  '| Metric | Rule-based baseline | Muse Spark (via same code as proxy) |',
  '|---|---|---|',
  `| Valid JSON, first try | n/a (no model) | ${pct(stat.firstOk, N)} |`,
  `| Valid JSON, after 1 retry | n/a | ${pct(stat.finalOk, N)} |`,
  `| Intent accuracy | ${pct(stat.bCorrect, N)} | ${pct(stat.mCorrect, N)} (model answers only) |`,
  `| Intent accuracy, end to end with fallback | ${pct(stat.bCorrect, N)} | ${pct(stat.e2e, N)} |`,
  `| Asked a question on ${unc.length} unclear sequences | ${pct(stat.bAsk, unc.length)} | ${pct(stat.mAsk, unc.length)} |`,
  `| Latency per utterance (mean / median / p95) | <1 ms | ${avg((r) => r.ms)} / ${lat[Math.floor(N / 2)]} / ${lat[Math.ceil(0.95 * N) - 1]} ms |`,
  `| Tokens per utterance (input / output / total, incl. retries) | 0 | ${avg((r) => r.m.usage?.input)} / ${avg((r) => r.m.usage?.output)} / ${avg((r) => r.m.usage?.total)} |`,
  '',
  'Caveats: gold labels and the baseline were written by the same author (an AI assistant), so the baseline is tuned to this set and its accuracy is not evidence it generalises. One run; model output varies. Sign sequences are idealised, not recognizer output.',
].join('\n');
console.log('\n' + table);

mkdirSync('eval', { recursive: true });
writeFileSync('eval/results.json', JSON.stringify({ model: MODEL, stat, rows: rows.map((r) => ({ gold: r.gold, signs: r.str, ms: r.ms, model: r.m.ok ? r.m.result : { failed: r.m.reason }, usage: r.m.usage })) }, null, 2));
writeFileSync('eval/results-table.md', table + '\n');
const rate = rows.filter((r) => r.m.ok && r.m.result.intent !== 'unclear');
writeFileSync('eval/kiswahili-rating.md', [
  '# Kiswahili rating sheet (model output, one row per sequence)', '',
  'Score each row 1-5 for the Kiswahili column only. Suggested scale: 5 = natural and correct, 4 = correct, slightly stiff, 3 = understandable but odd, 2 = partly wrong or confusing, 1 = wrong or nonsense.',
  'Also ask a Kiswahili speaker (ideally a Deaf Kenyan) if you can: your own rating is a first pass, not validation.', '',
  '| # | Signs | English | Kiswahili (model) | Score 1-5 | Notes |', '|---|---|---|---|---|---|',
  ...rate.map((r, i) => `| ${i + 1} | ${r.str} | ${r.m.result.english} | ${r.m.result.kiswahili} |  |  |`),
  '', 'Average score: ____ (n = ' + rate.length + ')',
].join('\n') + '\n');
console.log('\nWrote eval/results.json, eval/results-table.md, eval/kiswahili-rating.md');
