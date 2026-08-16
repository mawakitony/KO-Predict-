import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  loadOwnLearnerReminders,
  parseReminderAcks,
  REMINDER_ACK_COOKIE,
  serializeReminderAcks,
} from "@/lib/learner/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/reminders/ack
 * Body optionnel: { ids?: string[] } — sinon accuse lecture de tous les rappels courants.
 */
export async function POST(request: Request) {
  const result = await loadOwnLearnerReminders();
  if (result.error === "UNAUTHENTICATED") {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  if (result.error) {
    return NextResponse.json(
      { ok: false, error: "Impossible d'accuser réception." },
      { status: 503 },
    );
  }

  let ids: string[] | null = null;
  try {
    const body = (await request.json().catch(() => null)) as {
      ids?: unknown;
    } | null;
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((id): id is string => typeof id === "string");
    }
  } catch {
    ids = null;
  }

  const targetIds =
    ids && ids.length > 0 ? ids : result.reminders.map((r) => r.id);

  const jar = await cookies();
  const acks = parseReminderAcks(jar.get(REMINDER_ACK_COOKIE)?.value);
  const now = new Date().toISOString();
  for (const id of targetIds) {
    acks[id] = now;
  }

  jar.set(REMINDER_ACK_COOKIE, serializeReminderAcks(acks), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  const unreadCount = result.reminders.filter((r) => !acks[r.id]).length;

  return NextResponse.json({ ok: true, unreadCount });
}
