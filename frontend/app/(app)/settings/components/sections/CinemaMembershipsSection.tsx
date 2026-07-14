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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">
        Mine biograftilknytninger
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Den aktive biograf bestemmer, hvilke data og
        realtime-opdateringer du arbejder med i denne session.
        Standardbiografen bruges ved næste almindelige login.
      </p>

      {loading ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
          Henter biograftilknytninger...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : memberships.length === 0 ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
          Din bruger har ingen aktive biograftilknytninger.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {memberships.map((membership) => {
            const logoSrc = getLogoSrc(
              membership.cinema.logoUrl,
            );
            const isCurrent =
              membership.cinemaId === currentCinemaId;
            const isSwitching =
              switchingCinemaId === membership.cinemaId;

            return (
              <article
                key={membership.id}
                className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center ${
                  isCurrent
                    ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/25"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt=""
                      className="h-12 w-12 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {membership.cinema.name
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">
                        {membership.cinema.name}
                      </h3>

                      {isCurrent && (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-100">
                          Aktiv nu
                        </span>
                      )}

                      {membership.isPrimary && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                          Standardbiograf
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                    className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSwitching
                      ? "Skifter..."
                      : "Skift til denne biograf"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {memberships.length > 1 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Biografskiftet gælder kun den aktuelle session og
          ændrer ikke din standardbiograf.
        </p>
      )}
    </section>
  );
}
