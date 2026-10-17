import type { StarmapGraph, StarmapMemoryCard, StarmapNode } from '../api/types';

/** Text a set of stars is matched against: `primary` terms weigh double. */
export interface StarQuery {
  primary: string;
  secondary: string;
}

const STEM_LENGTH = 5;
const MIN_SCORE = 2;

const STOPWORDS = new Set([
  'about',
  'after',
  'also',
  'among',
  'been',
  'before',
  'being',
  'between',
  'both',
  'could',
  'does',
  'each',
  'from',
  'have',
  'here',
  'into',
  'just',
  'like',
  'make',
  'more',
  'most',
  'much',
  'only',
  'other',
  'over',
  'same',
  'should',
  'some',
  'such',
  'than',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'very',
  'what',
  'when',
  'where',
  'which',
  'while',
  'will',
  'with',
  'within',
  'would',
  'your',
  'algo',
  'ante',
  'cada',
  'como',
  'con',
  'desde',
  'donde',
  'entre',
  'esta',
  'este',
  'esto',
  'estos',
  'estas',
  'hace',
  'hacia',
  'hasta',
  'mismo',
  'muchos',
  'nuestra',
  'nuestro',
  'otra',
  'otro',
  'para',
  'pero',
  'porque',
  'puede',
  'sobre',
  'solo',
  'tambien',
  'tiene',
  'todo',
  'todos',
  'tras',
  'una',
  'unos',
  'unas'
]);

function stems(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .match(/\p{L}{4,}/gu);
  const result = new Set<string>();
  for (const word of words ?? []) {
    if (!STOPWORDS.has(word)) result.add(word.slice(0, STEM_LENGTH));
  }
  return result;
}

/** Node ids for memories are `memory:<source>:<index>[:<fingerprint>]`, indexing into `graph.memory`. */
export function findMemoryCard(graph: StarmapGraph, node: StarmapNode): StarmapMemoryCard | null {
  const index = Number(node.id.split(':')[2]);
  const card = Number.isInteger(index) ? graph.memory[index] : undefined;
  return card ?? null;
}

/** Ids of stars whose label, category, description or memory text share enough terms with the query. */
export function findRelatedStars(graph: StarmapGraph, query: StarQuery): Set<string> {
  const primary = stems(query.primary);
  const secondary = stems(query.secondary);
  const related = new Set<string>();
  if (primary.size === 0 && secondary.size === 0) return related;

  for (const node of graph.nodes) {
    const memory = node.kind === 'memory' ? findMemoryCard(graph, node) : null;
    const terms = stems(
      [
        node.label,
        node.category,
        node.description ?? '',
        memory?.title ?? '',
        memory?.body ?? ''
      ].join(' ')
    );
    let score = 0;
    for (const term of terms) {
      if (primary.has(term)) score += 2;
      else if (secondary.has(term)) score += 1;
      if (score >= MIN_SCORE) {
        related.add(node.id);
        break;
      }
    }
  }
  return related;
}
