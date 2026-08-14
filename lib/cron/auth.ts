import "server-only";

/**
 * Auth commune des routes cron Vercel.
 * Accepte x-cron-secret ou Authorization: Bearer CRON_SECRET.
 */
export function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === cronSecret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${cronSecret}`) return true;

  return false;
}
