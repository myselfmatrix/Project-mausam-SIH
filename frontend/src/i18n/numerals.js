/*
  Digits in the reader's own script.

  Every Indian script has its own digit forms. Rather than call Intl per value
  — most of what the UI shows is a string with digits embedded in it ("05:52",
  "14 km/h", "5:00 PM – 7:00 PM"), not a bare number — each language maps to
  the first codepoint of its digit block and ASCII 0-9 is shifted onto it.

  A note on usage, because the scripts differ in practice: Devanagari, Bengali
  and Gujarati digits are still read in everyday text. Tamil, Telugu and
  Kannada digits are largely historical — most readers of those languages
  expect Western digits. Both are one word away here, so the choice stays a
  data decision rather than a code change.
*/

const DIGIT_BASE = {
  deva: 0x0966, // ० १ २ ३ — Hindi, Marathi
  beng: 0x09e6, // ০ ১ ২ ৩ — Bengali
  gujr: 0x0ae6, // ૦ ૧ ૨ ૩ — Gujarati
  tamldec: 0x0be6, // ௦ ௧ ௨ ௩ — Tamil
  telu: 0x0c66, // ౦ ౧ ౨ ౩ — Telugu
  knda: 0x0ce6, // ೦ ೧ ೨ ೩ — Kannada
}

const LATIN_LETTER = /[A-Za-z]/

/**
 * Rewrites ASCII digits in `text` into `system`'s digits.
 *
 * Anything that isn't 0-9 survives untouched, so decimal points, colons,
 * percent signs, units and the surrounding words are all preserved. Returns
 * the input unchanged for 'latn' or an unknown system.
 *
 * Digit runs welded to Latin letters are left alone: "SIH26076" is an
 * identifier, not a quantity, and rendering it "SIH२६०७६" makes it unusable
 * for the one thing an identifier is for. A measurement always has a
 * separator ("AQI 142", "12 km"), so this costs nothing real.
 */
export function toNumerals(text, system) {
  const base = DIGIT_BASE[system]
  if (!base || text == null) return text

  return String(text).replace(/\d+/g, (run, index, whole) => {
    const before = whole[index - 1]
    const after = whole[index + run.length]
    if ((before && LATIN_LETTER.test(before)) || (after && LATIN_LETTER.test(after))) return run
    return run.replace(/[0-9]/g, (d) => String.fromCodePoint(base + Number(d)))
  })
}

export const hasNumerals = (system) => Boolean(DIGIT_BASE[system])
