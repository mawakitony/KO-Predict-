import type { ReactNode } from "react";
import Link from "next/link";
import { PaceActivityBars } from "@/components/admin/PaceActivityBars";
import { ReadinessHistoryChart } from "@/components/admin/ReadinessHistoryChart";
import { RingProgress, RingProgressRow } from "@/components/admin/RingProgress";
import { AdminAvatar } from "@/components/admin/AdminUi";
import {
  IconBook,
  IconCheck,
  IconMail,
  IconSpark,
} from "@/components/admin/AdminIcons";
import type { AdminStudentDetail } from "@/lib/admin/types";
import {
  formatDateFr,
  formatDateTimeFr,
  formatPercent,
  formatScore,
  paceStatusLabel,
  riskLabel,
  riskToneClasses,
} from "@/lib/dashboard/format";

interface StudentProfileBoardProps {
  detail: AdminStudentDetail;
  email?: string | null;
}

function InsightCard({
  icon,
  title,
  subtitle,
  badge,
  tone,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  tone: "blue" | "sky" | "teal" | "amber" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-800",
    sky: "bg-sky-50 text-sky-800",
    teal: "bg-teal-50 text-teal-800",
    amber: "bg-amber-50 text-amber-900",
    rose: "bg-rose-50 text-rose-800",
  } as const;
  const badgeTone = {
    blue: "bg-blue-600 text-white",
    sky: "bg-sky-600 text-white",
    teal: "bg-teal-600 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-500 text-white",
  } as const;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${tones[tone]}`}
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-current shadow-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs opacity-80">{subtitle}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeTone[tone]}`}
      >
        {badge}
      </span>
    </div>
  );
}

export function StudentProfileBoard({
  detail,
  email,
}: StudentProfileBoardProps) {
  const { student, metrics, prediction, history, dataSource, accountStatus } =
    detail;
  const tone = riskToneClasses(prediction.riskLevel);
  const targetExamLabel = student.targetExamDate
    ? formatDateFr(student.targetExamDate)
    : "Date d'examen non renseignée";

  const readiness = prediction.readinessScore;
  const probability = prediction.readinessProbability;
  const progress = prediction.progressPercent;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--admin-blue-hover)] hover:underline"
        >
          ← Retour aux apprenants
        </Link>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-blue-100">
          Source :{" "}
          {dataSource === "database" ? "Supabase / LearnWorlds" : "démo"}
        </span>
      </div>

      <div className="grid w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
          {/* Profil */}
          <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
            <div className="flex flex-col items-center text-center">
              <AdminAvatar name={student.fullName} size="lg" />
              <h1 className="ko-display mt-3 text-xl font-semibold text-slate-900">
                {student.fullName}
              </h1>
              {email ? (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--admin-blue)]">
                  <IconMail className="ko-icon-sm" />
                  {email}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-500">
                {student.certification}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}
              >
                {prediction.riskLevel
                  ? `${prediction.riskLevel} — ${riskLabel(prediction.riskLevel)}`
                  : riskLabel(null)}
              </span>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5">
              <ProfileRow label="Certification" value={student.certification} />
              <ProfileRow label="Date cible" value={targetExamLabel} />
              <ProfileRow
                label="Accès"
                value={
                  accountStatus === "DISABLED"
                    ? "Désactivé"
                    : accountStatus === "PENDING_ACTIVATION"
                      ? "En attente"
                      : "Actif"
                }
              />
              <ProfileRow
                label="Fuseau"
                value={student.timezone ?? "—"}
              />
              <ProfileRow
                label="Dernière activité"
                value={formatDateTimeFr(metrics.lastActivityDate)}
              />
              <ProfileRow
                label="Dernière synchronisation LearnWorlds"
                value={
                  metrics.recordedAt
                    ? formatDateTimeFr(metrics.recordedAt)
                    : "Pas encore synchronisé"
                }
              />
              <ProfileRow
                label="Inactivité"
                value={`${metrics.inactiveDays} j`}
              />
            </dl>
          </section>

          {/* Colonne centrale */}
          <div className="min-w-0 space-y-4 overflow-hidden">
            <section className="overflow-hidden rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="ko-display text-base font-semibold text-slate-900">
                  Indicateurs clés
                </h2>
                <span className="text-xs text-slate-400">
                  Estimation KO Predict™
                </span>
              </div>
              <RingProgressRow>
                <RingProgress
                  value={readiness}
                  label="Préparation"
                  tone="sky"
                />
                <RingProgress
                  value={probability}
                  label="Probabilité d’être prêt"
                  tone="emerald"
                />
                <RingProgress
                  value={progress}
                  label="Progression"
                  tone="amber"
                  striped
                />
              </RingProgressRow>
              <p className="mt-2 text-center text-sm text-slate-500">
                Readiness{" "}
                <span className="font-semibold text-slate-800">
                  {readiness != null
                    ? `${formatScore(readiness)} / 100`
                    : "en préparation"}
                </span>
                {" · "}
                {paceStatusLabel(prediction.paceStatus)}
              </p>
            </section>

            <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="ko-display text-base font-semibold text-slate-900">
                  Rythme d&apos;activité
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    Actuel :{" "}
                    <strong className="text-slate-800">
                      {prediction.currentPace != null &&
                      prediction.currentPace > 0
                        ? `${prediction.currentPace}/sem`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Nécessaire :{" "}
                    <strong className="text-[var(--admin-blue-hover)]">
                      {prediction.requiredPace != null
                        ? `${prediction.requiredPace}/sem`
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>
              <PaceActivityBars
                currentPace={prediction.currentPace}
                requiredPace={prediction.requiredPace}
              />
              <p className="mt-2 text-xs text-slate-400">
                Répartition illustrative sur 7 jours (données hebdomadaires V1).
              </p>
            </section>

            <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="ko-display text-base font-semibold text-slate-900">
                  Évolution de la préparation
                </h2>
                <span className="rounded-full bg-[var(--admin-blue-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-blue-hover)]">
                  Historique
                </span>
              </div>
              <ReadinessHistoryChart history={history} />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat
                label="Activités"
                value={`${metrics.completedActivities} / ${metrics.totalActivities}`}
              />
              <MiniStat
                label="Moyenne QCM"
                value={
                  metrics.qcmAverage != null
                    ? `${Math.round(metrics.qcmAverage)} %`
                    : "—"
                }
              />
              <MiniStat
                label="QCM récent"
                value={
                  metrics.recentQcmAverage != null
                    ? `${Math.round(metrics.recentQcmAverage)} %`
                    : "—"
                }
              />
              <MiniStat
                label="Temps d'étude"
                value={`${metrics.studyTimeMinutes} min`}
              />
              <MiniStat
                label="Progression"
                value={formatPercent(prediction.progressPercent)}
              />
              <MiniStat
                label="Probabilité"
                value={
                  prediction.readinessProbability != null
                    ? `${Math.round(prediction.readinessProbability)} %`
                    : "—"
                }
              />
            </section>
          </div>
        </div>

        {/* Colonne droite — agenda / insights */}
        <aside className="min-w-0 space-y-4 xl:max-w-sm">
          <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
            <h2 className="ko-display text-base font-semibold text-slate-900">
              Dates clés
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Trajectoire vers l&apos;examen
            </p>
            <div className="mt-4 space-y-2.5">
              <InsightCard
                tone="blue"
                icon={<IconBook className="ko-icon" />}
                title="Examen cible"
                subtitle={targetExamLabel}
                badge="Cible"
              />
              <InsightCard
                tone="sky"
                icon={<IconSpark className="ko-icon" />}
                title="Fin de contenu prévue"
                subtitle={
                  prediction.predictedCompletionDate
                    ? formatDateFr(prediction.predictedCompletionDate)
                    : "En attente"
                }
                badge="Fin"
              />
              <InsightCard
                tone="teal"
                icon={<IconCheck className="ko-icon" />}
                title="Prêt pour l'examen"
                subtitle={
                  prediction.predictedReadinessDate
                    ? formatDateFr(prediction.predictedReadinessDate)
                    : "En attente"
                }
                badge="Prêt"
              />
              <InsightCard
                tone={
                  prediction.riskLevel === "CRITICAL" ||
                  prediction.riskLevel === "RED"
                    ? "rose"
                    : prediction.riskLevel === "AMBER"
                      ? "amber"
                      : "blue"
                }
                icon={<IconSpark className="ko-icon" />}
                title="Niveau de risque"
                subtitle={riskLabel(prediction.riskLevel)}
                badge={prediction.riskLevel ?? "N/A"}
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[linear-gradient(160deg,#2563eb_0%,#1d4ed8_55%,#0f766e_100%)] p-5 text-white shadow-[0_12px_40px_-20px_rgba(37,99,235,0.65)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              Action recommandée
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/95 sm:text-base">
              {prediction.recommendedAction ??
                "Continuez la formation : KO Predict™ affinera bientôt l’estimation."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_8px_28px_-20px_rgba(37,99,235,0.4)] ring-1 ring-blue-100/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="ko-display mt-2 text-lg font-semibold text-slate-900">
        {value}
      </p>
    </article>
  );
}
