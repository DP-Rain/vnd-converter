import assert from 'node:assert/strict';
import { vndToInr, realCosts, mentalFactor, split, fmtInr, CHANGER_RATE } from '../calc.js';
import { readOcrText, colourFamily, verdict } from '../notes.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('427,440 VND at 275 → ₹1,554', () => assert.equal(fmtInr(vndToInr(427440, 275)), '₹1,554'));
t('changer 238.2', () => assert.equal(CHANGER_RATE.toFixed(1), '238.2'));
t('mental factor 275 → 3.64', () => assert.equal(mentalFactor(275), 3.64));
t('niyo adds 499', () => assert.equal(Math.round(realCosts(275000, 275).niyo), 1499));
t('burgundy +4.13%', () => assert.equal(realCosts(275000, 275).burgundy.toFixed(2), '1041.30'));
t('split 3 ways +10% tip', () => assert.equal(split(300, 3, 10).each.toFixed(0), '110'));

const cases = [
  ['500000', 500000], ['500 000', 500000], ['500.000 DONG', 500000],
  ['NĂM TRĂM NGHÌN ĐỒNG', 500000], ['20000', 20000], ['HAI MUOI NGHIN DONG 20000', 20000],
  ['200000\nHAI TRAM NGHIN', 200000], ['10000 MUOI NGHIN', 10000], ['NAM MUOI NGHIN 50000', 50000],
  ['50O00', 50000], ["NGAN HANG HAI MU'Ol NGHIN DONG", 20000], ['MUO NGHIN BONG', 10000], ['CONG HOA XA HOI', null],
];
for (const [txt, want] of cases) t(`ocr "${txt.replace('\n', ' ')}" → ${want}`, () => assert.equal(readOcrText(txt).best, want));

t('20000 text never reads as 500000', () => assert.notEqual(readOcrText('20000 HAI MUOI NGHIN').best, 500000));
t('500000 text never reads as 20000', () => assert.notEqual(readOcrText('500000 NAM TRAM NGHIN').best, 20000));

t('blue colour alone gives no answer', () => {
  const c = colourFamily(60, 110, 200);
  assert.equal(c.family, 'blue');
  const v = verdict(readOcrText(''), c);
  assert.equal(v.vnd, null); assert.equal(v.confirmed, false); assert.equal(v.blueCheck, true);
});
t('teal colour alone gives no answer', () => {
  const v = verdict(readOcrText('xx'), colourFamily(40, 170, 185));
  assert.equal(v.vnd, null);
});
t('OCR 500000 + green colour → flags colour mismatch', () => {
  const v = verdict(readOcrText('500000'), colourFamily(70, 150, 80));
  assert.equal(v.vnd, 500000); assert.equal(v.warnColour, true); assert.equal(v.blueCheck, true);
});
console.log(`\n${n} passed`);
