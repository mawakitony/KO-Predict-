import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { LandingMetricCards } from "@/components/ui/LandingMetricCards";

const benefits = [
  {
    icon: (
      <span className="ko-display text-[13px] font-black text-sky-600">72</span>
    ),
    title: "Préparation lisible",
    text: "Un score clair pour savoir où vous en êtes avant l’examen.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-teal-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        aria-hidden
      >
        <path
          d="M12 19V5M6 11l6-6 6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Trajectoire data-driven",
    text: "Rythme, progression et performances pour rester sur la bonne voie.",
  },
] as const;

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 ko-landing-bg" />
      <div aria-hidden className="pointer-events-none absolute inset-0 ko-landing-glow" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-10 sm:gap-12 sm:px-6 sm:py-12 lg:flex-row lg:items-center lg:gap-6 lg:px-10 lg:py-14">
        <div className="flex w-full max-w-lg flex-1 flex-col justify-center">
          <p className="ko-fade-up mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            WOLOYEM · Examens
          </p>

          <BrandMark href={null} tone="dark" size="xl" className="ko-fade-up" />

          <h1 className="ko-display ko-fade-up ko-fade-up-delay-1 mt-7 text-[1.9rem] font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-[2.45rem]">
            Votre trajectoire vers
            <span className="ko-landing-headline-accent"> la préparation</span>{" "}
            à l&apos;examen.
          </h1>

          <ul className="ko-fade-up ko-fade-up-delay-2 mt-8 space-y-5">
            {benefits.map((item) => (
              <li key={item.title} className="flex items-start gap-3.5">
                <span className="ko-landing-benefit-icon">{item.icon}</span>
                <div className="pt-0.5">
                  <p className="text-[15px] font-bold tracking-tight text-slate-800">
                    {item.title}
                  </p>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="ko-fade-up ko-fade-up-delay-3 mt-10">
            <Link
              href="/demo"
              className="ko-landing-cta inline-flex max-w-full gap-2 px-6 py-3.5 text-sm font-bold text-white sm:px-9"
            >
              Accéder à mon tableau de bord
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex flex-1 justify-center lg:justify-end">
          <LandingMetricCards />
        </div>
      </main>
    </div>
  );
}
