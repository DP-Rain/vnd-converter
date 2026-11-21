# VND → INR Converter + Note Identifier — Build Reference

Handoff spec written 21 Nov 2026 (Vietnam trip 22–30 Nov). Build in a new session.
User stack: Flutter (Android), free-tier only, offline-first preferred.

## Goal
Phone app for a family trip: (1) type or scan a VND price → see INR instantly;
(2) point camera at a Vietnamese banknote → app says which note and its INR value.

## Core conversion
- Rate source: free API (e.g. open.er-api.com/v6/latest/VND or frankfurter-style; check which still serves VND before shipping). Cache last rate offline.
- Fallback rate: 275 VND = ₹1 (₹0.00364 per VND), Nov 2026 estimate.
- Show the trip's real-world rates too, so totals match what was paid:
  - India changer: 20,00,000 VND for ₹8,395 → 238.2 VND/₹
  - Niyo ATM: Visa rate + ₹499 flat fee per withdrawal
  - Axis Burgundy: Visa rate + 3.5% + GST
- Input: big number pad; quick "000" key (VND prices always end in 000).
- Output: ₹ exact + mental-math hint "drop 3 zeros × 3.6".
- Reverse mode: INR → VND.
- Optional: split bill (÷ people), tip %, running trip-spend log.

## Note identification (camera)
Polymer notes (current, all in circulation):

| Note (VND) | ≈ ₹ (275) | Main colour | Back image |
|---|---|---|---|
| 10,000 | 36 | brown / yellow | Bach Ho offshore oil rig |
| 20,000 | 73 | blue | Japanese Covered Bridge, Hoi An |
| 50,000 | 182 | pink / purple | Nghenh Luong Dinh pavilion, Hue |
| 100,000 | 364 | green | Khue Van Cac, Temple of Literature, Hanoi |
| 200,000 | 727 | red-orange / brown | Dinh Huong islet, Ha Long Bay |
| 500,000 | 1,818 | cyan / teal-blue | Ho Chi Minh's house, Kim Lien |

Front of all polymer notes: Ho Chi Minh portrait + transparent window.
Small cotton notes (1,000 / 2,000 / 5,000) still circulate, worth ₹4–18.

KEY SAFETY FEATURE: 20,000 (₹73) vs 500,000 (₹1,818) are both blue and the
most common tourist mix-up (25× value difference). App must flag this
explicitly and double-check via the printed number (OCR), not colour alone.

NOTE: colours/images above are from general knowledge — verify against
State Bank of Vietnam (sbv.gov.vn) banknote pages before training/labelling.

### Approach options (pick in build session)
1. Simplest, offline: on-device OCR (Google ML Kit text recognition) → read the
   large denomination digits → map to value. Add colour check as 2nd signal.
2. Better: TFLite image classifier (6–9 classes, front+back) trained on
   own photos of real notes; ML Kit OCR as confirmation.
3. Avoid sending photos to a cloud API (privacy, roaming data).

### Acceptance tests
- Each of the 6 polymer notes, front and back, correct in ≥ 95% of shots.
- 20k vs 500k never confused in test set.
- Works offline (airplane mode) after first launch.
- Typed 427,440 VND → shows ₹1,554 at 275.

## Out of scope
Payments, accounts, ads, cloud sync.
