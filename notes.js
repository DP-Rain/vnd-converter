// Note identification logic — pure functions, no DOM. Tested by tests/test.mjs.
// Colours/images are general knowledge, NOT verified against sbv.gov.vn.
// Safety rule: a 20,000 or 500,000 result is only ever given from the printed
// number (OCR). Colour alone never decides between them.

export const NOTES = [
  { vnd: 500000, colour: 'cyan / teal-blue', hex: '#2aa7b8', back: "Ho Chi Minh's house, Kim Lien", polymer: true },
  { vnd: 200000, colour: 'red-orange / brown', hex: '#c8643c', back: 'Dinh Huong islet, Ha Long Bay', polymer: true },
  { vnd: 100000, colour: 'green', hex: '#4e9a52', back: 'Khue Van Cac, Temple of Literature', polymer: true },
  { vnd: 50000, colour: 'pink / purple', hex: '#c0578f', back: 'Nghenh Luong Dinh, Hue', polymer: true },
  { vnd: 20000, colour: 'blue', hex: '#3d6fc4', back: 'Japanese Covered Bridge, Hoi An', polymer: true },
  { vnd: 10000, colour: 'brown / yellow', hex: '#b8913a', back: 'Bach Ho oil rig', polymer: true },
  { vnd: 5000, colour: 'blue-purple (paper)', hex: '#6a6fb5', back: 'Tri An hydro plant', polymer: false },
  { vnd: 2000, colour: 'brown-grey (paper)', hex: '#8b7766', back: 'Nam Dinh textile factory', polymer: false },
  { vnd: 1000, colour: 'olive / purple (paper)', hex: '#8a8a5a', back: 'Elephant logging', polymer: false },
];
const DENOMS = NOTES.map((n) => n.vnd);
export const CONFUSABLE = new Set([20000, 500000]);

// Vietnamese words for the value, diacritics stripped (OCR runs in English mode).
const WORDS = [
  [500000, /NAM\s*TRAM\s*NGH/],
  [200000, /HAI\s*TRAM\s*NGH/],
  [100000, /MOT\s*TRAM\s*NGH/],
  [50000, /NAM\s*MU\W?O\W?[IL1]?\s*NGH/],
  [20000, /HAI\s*MU\W?O\W?[IL1]?\s*NGH/],
  [10000, /(^|[^A-Z])MU\W?O\W?[IL1]?\s*NGH/],
  [5000, /NAM\s*NGH/],
  [2000, /HAI\s*NGH/],
  [1000, /MOT\s*NGH/],
];

const stripMarks = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[ĐđÐ]/g, 'D').toUpperCase();

// Returns { scores: {vnd: n}, best: vnd|null, margin }
export function readOcrText(text) {
  const scores = {};
  const add = (v, w) => { scores[v] = (scores[v] || 0) + w; };
  // join "500 000" / "500.000" / "500,000" into "500000"
  let t = text.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, '0');
  t = t.replace(/(\d)[\s.,'’]+(?=\d{3}(?!\d))/g, '$1');
  for (const tok of t.match(/\d+/g) || []) {
    const n = Number(tok);
    if (DENOMS.includes(n)) add(n, tok.length >= 5 ? 3 : 2);
  }
  const u = stripMarks(text);
  for (const [v, re] of WORDS) {
    if (re.test(u)) { add(v, 2); break; }   // first (longest) match only
  }
  const ranked = Object.entries(scores).map(([v, s]) => [Number(v), s]).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { scores, best: null, margin: 0 };
  const margin = ranked[0][1] - (ranked[1] ? ranked[1][1] : 0);
  return { scores, best: margin > 0 ? ranked[0][0] : null, margin };
}

// rgb (0-255) average of note centre → colour family + candidate notes
export function colourFamily(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max ? d / max : 0;
  if (s < 0.12 || d < 18) return { family: 'grey/unclear', candidates: [] };
  let h;
  if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 20 || h >= 340) return { family: 'red', candidates: [200000] };
  if (h < 45) return { family: 'orange/brown', candidates: [200000, 10000] };
  if (h < 70) return { family: 'yellow/brown', candidates: [10000] };
  if (h < 160) return { family: 'green', candidates: [100000] };
  if (h < 250) return { family: 'blue', candidates: [20000, 500000] };   // NEVER resolved by colour
  if (h < 290) return { family: 'purple', candidates: [50000] };
  return { family: 'pink', candidates: [50000] };
}

// Combine OCR + colour into a verdict for the UI.
export function verdict(ocr, colour) {
  if (ocr.best) {
    const agrees = colour.candidates.length === 0 || colour.candidates.includes(ocr.best);
    return {
      vnd: ocr.best,
      confirmed: true,
      warnColour: !agrees,
      blueCheck: CONFUSABLE.has(ocr.best),
    };
  }
  return {
    vnd: null,
    confirmed: false,
    guesses: colour.candidates,
    blueCheck: colour.candidates.some((v) => CONFUSABLE.has(v)),
  };
}

export const noteFor = (vnd) => NOTES.find((n) => n.vnd === vnd);
