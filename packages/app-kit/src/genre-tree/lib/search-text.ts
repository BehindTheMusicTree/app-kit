/** NFD-decompose, strip diacritics and casefold, so "Bossa Nová" and "bossa nova" compare equal. */
export const foldSearchText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const trigrams = (folded: string): Set<string> => {
  const padded = `  ${folded} `;
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++) grams.add(padded.slice(i, i + 3));
  return grams;
};

/** Jaccard similarity of the accent-folded trigram sets, 0..1. */
export const trigramSimilarity = (a: string, b: string): number => {
  const ta = trigrams(foldSearchText(a));
  const tb = trigrams(foldSearchText(b));
  let shared = 0;
  for (const gram of ta) if (tb.has(gram)) shared++;
  const union = ta.size + tb.size - shared;
  return union === 0 ? 0 : shared / union;
};

export const FUZZY_MIN_SIMILARITY = 0.3;

const TIER_EXACT = 0;
const TIER_PREFIX = 1;
const TIER_SUBSTRING = 2;
const TIER_FUZZY = 3;

/**
 * Ranks `items` against `query` like the API's typeahead does: exact name, then prefix, then substring,
 * then accent-folded trigram similarity; ties break on `getViews` (descending) then name. An empty query matches nothing.
 */
export function rankByName<T>(
  items: readonly T[],
  query: string,
  getName: (item: T) => string,
  getViews?: (item: T) => number,
): T[] {
  const folded = foldSearchText(query);
  if (!folded) return [];

  const scored: { item: T; tier: number; similarity: number; views: number; name: string }[] = [];
  for (const item of items) {
    const name = getName(item);
    const foldedName = foldSearchText(name);
    let tier: number;
    let similarity = 0;
    if (foldedName === folded) tier = TIER_EXACT;
    else if (foldedName.startsWith(folded)) tier = TIER_PREFIX;
    else if (foldedName.includes(folded)) tier = TIER_SUBSTRING;
    else {
      similarity = trigramSimilarity(name, query);
      if (similarity < FUZZY_MIN_SIMILARITY) continue;
      tier = TIER_FUZZY;
    }
    scored.push({ item, tier, similarity, views: getViews?.(item) ?? 0, name: foldedName });
  }

  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      b.similarity - a.similarity ||
      b.views - a.views ||
      a.name.localeCompare(b.name),
  );
  return scored.map((entry) => entry.item);
}


export type NameIndex<T> = readonly {
  item: T;
  name: string;
  grams: ReadonlySet<string>;
  views: number;
}[];

/** Build once per immutable item collection, rather than folding every name on each keystroke. */
export function createNameIndex<T>(
  items: readonly T[],
  getName: (item: T) => string,
  getViews?: (item: T) => number,
): NameIndex<T> {
  return items.map((item) => {
    const name = foldSearchText(getName(item));
    return { item, name, grams: trigrams(name), views: getViews?.(item) ?? 0 };
  });
}

/** Same ranking and stable tie order as rankByName; a limit keeps only the best requested entries. */
export function rankNameIndex<T>(index: NameIndex<T>, query: string, limit = Infinity): T[] {
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 0)) {
    throw new RangeError("Search limit must be a nonnegative integer or Infinity");
  }
  const folded = foldSearchText(query);
  if (!folded || limit === 0) return [];
  const queryGrams = trigrams(folded);
  const scored: { item: T; tier: number; similarity: number; views: number; name: string }[] = [];
  const compare = (a: (typeof scored)[number], b: (typeof scored)[number]) =>
    a.tier - b.tier || b.similarity - a.similarity || b.views - a.views || a.name.localeCompare(b.name);
  for (const entry of index) {
    let tier: number;
    let similarity = 0;
    if (entry.name === folded) tier = TIER_EXACT;
    else if (entry.name.startsWith(folded)) tier = TIER_PREFIX;
    else if (entry.name.includes(folded)) tier = TIER_SUBSTRING;
    else {
      let shared = 0;
      for (const gram of queryGrams) if (entry.grams.has(gram)) shared++;
      const union = entry.grams.size + queryGrams.size - shared;
      similarity = union === 0 ? 0 : shared / union;
      if (similarity < FUZZY_MIN_SIMILARITY) continue;
      tier = TIER_FUZZY;
    }
    const candidate = { ...entry, tier, similarity };
    if (limit === Infinity) scored.push(candidate);
    else {
      // Insert after ties so equal names/views retain the input order, just like stable Array.sort.
      let low = 0;
      let high = scored.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (compare(candidate, scored[mid]) < 0) high = mid;
        else low = mid + 1;
      }
      if (low < limit) {
        scored.splice(low, 0, candidate);
        if (scored.length > limit) scored.pop();
      }
    }
  }
  if (limit === Infinity) scored.sort(compare);
  return scored.map((entry) => entry.item);
}
