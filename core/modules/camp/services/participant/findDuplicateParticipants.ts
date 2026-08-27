import { execute } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../lib/util/camelCase.js';

export const DEFAULT_DUPLICATE_THRESHOLD = 0.45;

export type ParticipantDuplicateGroup = {
  key: string;
  score: number;
  participants: Record<string, any>[];
};

type Pair = { a: number; b: number; score: number };

class UnionFind {
  private parent = new Map<number, number>();

  private root(id: number): number {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      return id;
    }
    const current = this.parent.get(id) as number;
    if (current === id) {
      return id;
    }
    const found = this.root(current);
    this.parent.set(id, found);
    return found;
  }

  union(a: number, b: number): void {
    const rootA = this.root(a);
    const rootB = this.root(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }

  groups(): Map<number, number[]> {
    const clusters = new Map<number, number[]>();
    for (const id of this.parent.keys()) {
      const root = this.root(id);
      const members = clusters.get(root) ?? [];
      members.push(id);
      clusters.set(root, members);
    }
    return clusters;
  }
}

/**
 * Casing/whitespace variants and true exact repeats (e.g. from data that predates the
 * name-uniqueness check in createParticipant.ts / orderCreator.ts). Always runs, no extension
 * needed. Every pair from this baseline is treated as maximally confident (score 1).
 */
async function getBaselinePairs(): Promise<Pair[]> {
  const result = await execute(
    pool,
    `
    SELECT array_agg(participant_id ORDER BY participant_id) AS ids
    FROM participant
    GROUP BY
      lower(trim(regexp_replace(first_name, '\\s+', ' ', 'g'))),
      lower(trim(regexp_replace(last_name, '\\s+', ' ', 'g')))
    HAVING count(*) > 1
    `
  );
  const pairs: Pair[] = [];
  for (const row of result.rows) {
    const ids: number[] = row.ids;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        pairs.push({ a: ids[i], b: ids[j], score: 1 });
      }
    }
  }
  return pairs;
}

function normalizeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Classic edit-distance DP — no dependency needed for strings this short. */
function levenshteinDistance(a: string, b: string): number {
  const distances = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i += 1) distances[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) distances[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost
      );
    }
  }
  return distances[a.length][b.length];
}

/** 1 = identical, 0 = completely different. */
function nameSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - levenshteinDistance(a, b) / maxLength;
}

/**
 * Near-duplicates (typos, nicknames): pull every participant's name once, then compare all pairs
 * in memory. No DB extension involved — fine at admin-tool scale (this runs on demand, not per
 * request). If the participant table grows into the tens of thousands, this is the spot to
 * revisit (e.g. bucket by first letter before comparing) rather than reaching for pg_trgm again.
 */
async function getFuzzyPairs(threshold: number): Promise<Pair[]> {
  const numericThreshold = Number.isFinite(threshold)
    ? threshold
    : DEFAULT_DUPLICATE_THRESHOLD;
  const safeThreshold = Math.min(Math.max(numericThreshold, 0), 1);

  const result = await execute(
    pool,
    `SELECT participant_id, first_name, last_name FROM participant`
  );
  const rows: { participant_id: number; first_name: string; last_name: string }[] = result.rows;
  const names = rows.map((row) => normalizeName(row.first_name, row.last_name));

  const pairs: Pair[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const score = nameSimilarity(names[i], names[j]);
      if (score > safeThreshold) {
        pairs.push({ a: rows[i].participant_id, b: rows[j].participant_id, score });
      }
    }
  }
  return pairs;
}

async function loadParticipantDetails(ids: number[]): Promise<Map<number, Record<string, any>>> {
  const map = new Map<number, Record<string, any>>();
  if (ids.length === 0) {
    return map;
  }
  const idList = ids.join(',');
  const result = await execute(
    pool,
    `
    SELECT
      p.participant_id,
      p.uuid,
      p.first_name,
      p.last_name,
      p.birth_date,
      p.customer_id,
      p.created_at,
      c.full_name AS customer_name,
      c.email AS customer_email,
      (SELECT count(*) FROM registration r
        WHERE r.registration_participant_id = p.participant_id) AS registrations_count
    FROM participant p
    LEFT JOIN customer c ON c.customer_id = p.customer_id
    WHERE p.participant_id IN (${idList})
    `
  );
  for (const row of result.rows) {
    map.set(row.participant_id, camelCase(row));
  }
  return map;
}

/**
 * Find likely-duplicate participants: a normalized-exact baseline plus an in-memory fuzzy-name
 * layer, clustered with union-find since a participant can be a near-match to more than one
 * other row.
 */
export default async function findDuplicateParticipants(
  threshold: number = DEFAULT_DUPLICATE_THRESHOLD
): Promise<ParticipantDuplicateGroup[]> {
  const baselinePairs = await getBaselinePairs();
  const fuzzyPairs = await getFuzzyPairs(threshold);
  const pairs = [...baselinePairs, ...fuzzyPairs];

  if (pairs.length === 0) {
    return [];
  }

  const unionFind = new UnionFind();
  const bestScore = new Map<string, number>();
  for (const pair of pairs) {
    unionFind.union(pair.a, pair.b);
    const key = [pair.a, pair.b].sort().join('-');
    bestScore.set(key, Math.max(bestScore.get(key) ?? 0, pair.score));
  }

  const clusters = unionFind.groups();
  const allIds = Array.from(clusters.values()).flat();
  const participantDetails = await loadParticipantDetails(allIds);

  const groups: ParticipantDuplicateGroup[] = [];
  for (const [root, memberIds] of clusters) {
    if (memberIds.length < 2) {
      continue;
    }
    let score = 0;
    for (const pair of pairs) {
      if (memberIds.includes(pair.a) && memberIds.includes(pair.b)) {
        score = Math.max(score, pair.score);
      }
    }
    groups.push({
      key: `duplicate-${root}`,
      score,
      participants: memberIds
        .map((id) => participantDetails.get(id))
        .filter((participant): participant is Record<string, any> => !!participant)
    });
  }

  groups.sort((a, b) => b.score - a.score);
  return groups;
}
