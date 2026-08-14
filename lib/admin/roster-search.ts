/**
 * Matching recherche roster LearnWorlds (homonymes inclus).
 * Pure — testable sans I/O.
 */

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export interface RosterSearchFields {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
  tags?: string[];
}

/**
 * Tous les tokens de la requête doivent apparaître dans le haystack
 * (nom, prénom, email, tags). Une seule requête « Marie » trouve tous
 * les homonymes ; « Marie Dupont » exige les deux tokens.
 */
export function matchesRosterSearch(
  fields: RosterSearchFields,
  query: string,
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = normalizeSearchText(
    [
      fields.fullName,
      fields.firstName,
      fields.lastName,
      fields.email,
      fields.username,
      ...(fields.tags ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );

  return tokens.every((token) => haystack.includes(token));
}
