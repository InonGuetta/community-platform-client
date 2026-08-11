// "כמה יש", written the way Hebrew actually writes it.
//
// The number-then-plural form that works in English ("1 items" is merely
// clumsy) is simply wrong here: Hebrew counts one of something with the noun in
// the singular followed by the word for one — "שיעור אחד", not "1 שיעורים" —
// and says "אין" rather than "0". The screens were producing all three broken
// forms, each in its own file.
//
// `one` is the WHOLE phrase for exactly one, not just the noun, and that is
// deliberate: the word for "one" is gendered — שיעור אחד but רשימה אחת — and a
// helper that appended "אחד" itself would be wrong for every feminine noun. The
// caller knows the gender of its own word; this does not have to guess.
export const countLabel = (count, one, many) => {
  const n = Number(count) || 0;
  if (n <= 0) return `אין ${many}`;
  if (n === 1) return one;
  return `${n} ${many}`;
};
