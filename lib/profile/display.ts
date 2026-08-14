/**
 * Affichage identité KO Predict™ — source unique pour toute l’UI.
 *
 * Priorité du libellé :
 * 1. display_name (pseudo)
 * 2. first_name + last_name
 * 3. email
 */

export type ProfileDisplayInput = {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

function clean(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

/** Nom affiché (header, nav, profil). */
export function resolveDisplayName(input: ProfileDisplayInput): string {
  const pseudo = clean(input.displayName);
  if (pseudo) return pseudo;

  const first = clean(input.firstName);
  const last = clean(input.lastName);
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;

  const email = clean(input.email);
  if (email) return email;

  return "Utilisateur";
}

/** Initiales pour avatar fallback (ex. Assiki Tony → AT). */
export function resolveInitials(input: ProfileDisplayInput): string {
  const pseudo = clean(input.displayName);
  if (pseudo) {
    const parts = pseudo.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return pseudo.slice(0, 2).toUpperCase();
  }

  const first = clean(input.firstName);
  const last = clean(input.lastName);
  if (first && last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }
  if (first) return first.slice(0, 2).toUpperCase();
  if (last) return last.slice(0, 2).toUpperCase();

  const email = clean(input.email);
  if (email) {
    const local = email.split("@")[0] ?? email;
    return local.slice(0, 2).toUpperCase();
  }

  return "?";
}
