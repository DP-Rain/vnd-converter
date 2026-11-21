// Pure conversion math — no DOM. Tested by tests/test.mjs.

export const BUILT_IN_RATE = 274.95;          // VND per ₹, open.er-api.com, 20 Nov 2026
export const BUILT_IN_DATE = '2026-11-20';
export const FALLBACK_RATE = 275;             // spec fallback
export const CHANGER_RATE = 2000000 / 8395;   // India changer: 20,00,000 VND for ₹8,395 → 238.24
export const NIYO_FEE = 499;                  // ₹ flat per ATM withdrawal
export const BURGUNDY_MARKUP = 0.035 * 1.18;  // 3.5% + 18% GST on markup = 4.13%

export const vndToInr = (vnd, rate) => vnd / rate;
export const inrToVnd = (inr, rate) => inr * rate;

// "drop 3 zeros × k" where k = ₹ per 1,000 VND
export const mentalFactor = (rate) => Math.round((1000 / rate) * 100) / 100;

export function realCosts(vnd, rate) {
  const market = vnd / rate;
  return {
    market,
    changer: vnd / CHANGER_RATE,
    niyo: market + NIYO_FEE,
    burgundy: market * (1 + BURGUNDY_MARKUP),
  };
}

export function split(amount, people, tipPct) {
  const total = amount * (1 + tipPct / 100);
  return { total, each: total / Math.max(1, people) };
}

export const fmtInr = (n) =>
  '₹' + (n >= 100 ? Math.round(n).toLocaleString('en-IN')
                  : n.toLocaleString('en-IN', { maximumFractionDigits: 1 }));
export const fmtVnd = (n) => Math.round(n).toLocaleString('en-US') + ' ₫';
