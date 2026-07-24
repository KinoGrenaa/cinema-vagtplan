import type { CinemaMembership } from "../../helpers/settingsTypes";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CinemaMembershipsSectionProps = {
  memberships: CinemaMembership[];
  currentCinemaId: number | null;
  loading: boolean;
  switchingCinemaId: number | null;
  error: string;
  onSwitchCinema: (cinemaId: number) => void;
};

function getLogoSrc(logoUrl?: string | null) {
  if (!logoUrl) {
    return null;
  }

  if (
    logoUrl.startsWith("http://") ||
    logoUrl.startsWith("https://")
  ) {
    return logoUrl;
  }

  return logoUrl.startsWith("/")
    ? `${API_URL}${logoUrl}`
    : `${API_URL}/${logoUrl}`;
}

export default function CinemaMembershipsSection({
  memberships,
  currentCinemaId,
  loading,
  switchingCinemaId,
  error,
  onSwitchCinema,
}: CinemaMembershipsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-2xl font-bold">Mine biografer</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
        Den aktive biograf bestemmer, hvilke data og
        realtime-opdateringer du arbejder med i denne session.
        Standardbiografen bruges ved næste almindelige login.
      </p>

      {loading ? (
        <div
          className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          role="status"
        >
          Henter biograftilknytninger...
        </div>
      ) : error ? (
        <div
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : memberships.length === 0 ? (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          Din bruger har ingen aktive biograftilknytninger.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {memberships.map((membership) => {
            const logoSrc = getLogoSrc(membership.cinema.logoUrl);
            const isCurrent =
              membership.cinemaId === currentCinemaId;
            const isSwitching =
              switchingCinemaId === membership.cinemaId;

            return (
              <article
                key={membership.id}
                className={`rounded-xl border p-4 transition ${
                  isCurrent
                    ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/25"
                    : "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-950"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl border border-gray-200 bg-white object-contain p-1 dark:border-slate-600 dark:bg-slate-800"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {membership.cinema.name
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">
                        {membership.cinema.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {isCurrent && (
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                            Aktiv nu
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                        Biograf-ID: {membership.cinemaId}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && memberships.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onSwitchCinema(membership.cinemaId)
                      }
                      disabled={switchingCinemaId !== null}
                      className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSwitching
                        ? "Skifter..."
                        : "Skift til denne biograf"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {memberships.length > 1 && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          Biografskiftet gælder kun den aktuelle session og ændrer
          ikke din standardbiograf.
        </div>
      )}
    </section>
  );
}
