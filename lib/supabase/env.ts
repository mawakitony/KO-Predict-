/**
 * Lecture centralisée des variables d'environnement Supabase.
 * Les clés secrètes ne doivent jamais être exposées côté client.
 */

function requiredPublic(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable manquante : ${name}. Copiez .env.example vers .env.local et renseignez vos clés Supabase.`,
    );
  }
  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requiredPublic("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requiredPublic("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Variable manquante : SUPABASE_SERVICE_ROLE_KEY. Utilisation réservée au serveur uniquement.",
    );
  }
  return key;
}

export function isSupabasePublicConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
