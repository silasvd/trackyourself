import type { Food } from './types';

export type AliasMap = ReadonlyMap<string, readonly string[]>;

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase('de')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Simple German plural/inflection stemming: "Kartoffeln" → "kartoffel", "Tomaten" → "tomat".
function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const suffix of ['en', 'n', 'e', 's']) {
    if (token.endsWith(suffix)) return token.slice(0, -suffix.length);
  }
  return token;
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokenMatches(token: string, text: string, words: string[]): boolean {
  // Very short tokens ("Ei") only match word beginnings to avoid noise.
  if (token.length < 3) return words.some((word) => word.startsWith(token));
  if (text.includes(token) || text.includes(stem(token))) return true;
  if (token.length < 5) return false;
  return words.some(
    (word) =>
      withinOneEdit(token, word.slice(0, token.length)) ||
      withinOneEdit(token, word.slice(0, token.length + 1)) ||
      withinOneEdit(token, word.slice(0, token.length - 1)),
  );
}

export function foodTerms(food: Food, aliases: AliasMap): string[] {
  return [...(aliases.get(food.id) ?? []), ...(food.aliases ?? [])];
}

function rank(food: Food, query: string, aliases: AliasMap): number | null {
  const name = normalize(food.name);
  const terms = foodTerms(food, aliases).map(normalize);
  const haystack = [name, normalize(food.category ?? ''), ...terms].join(' ');
  const text = `${haystack} ${haystack.replace(/ /g, '')}`;
  const words = haystack.split(' ');
  const tokens = query.split(' ');
  if (!tokens.every((token) => tokenMatches(token, text, words))) return null;
  if (name === query) return 0;
  if (terms.includes(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (terms.some((term) => term.startsWith(query))) return 3;
  if (
    tokens.every((token) =>
      `${name} ${terms.join(' ')}`.split(' ').some((word) => {
        return word.startsWith(token) || word.startsWith(stem(token));
      }),
    )
  )
    return 4;
  return 5;
}

/** Filters and orders foods by relevance; without a query only favorites first, then name. */
export function searchFoods(
  foods: readonly Food[],
  rawQuery: string,
  aliases: AliasMap = new Map(),
): Food[] {
  const query = normalize(rawQuery);
  const ranked = foods
    .map((food) => ({ food, score: query ? rank(food, query, aliases) : 0 }))
    .filter(
      (value): value is { food: Food; score: number } => value.score !== null,
    );
  return ranked
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(b.food.isFavorite) - Number(a.food.isFavorite) ||
        (query
          ? a.food.name.length - b.food.name.length
          : // Without a query, recently used foods follow the favorites.
            (b.food.lastUsedAt ?? '').localeCompare(a.food.lastUsedAt ?? '')) ||
        a.food.name.localeCompare(b.food.name, 'de'),
    )
    .map((value) => value.food);
}
