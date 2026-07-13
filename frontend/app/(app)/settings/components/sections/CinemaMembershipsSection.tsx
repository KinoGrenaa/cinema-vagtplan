import type { CinemaMembership } from "../../helpers/settingsTypes";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CinemaMembershipsSectionProps = {
  memberships: CinemaMembership[];
  loading: boolean;
  error: string;
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
  loading,
  error,
}: CinemaMembershipsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">
        Mine biograftilknytninger
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Her vises de biografer, din bruger er aktivt
        tilknyttet. Standardbiografen bruges fortsat af
        systemet.
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

            return (
              <article
                key={membership.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    className="h-12 w-12 rounded-xl object-contain"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
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
              </article>
            );
          })}
        </div>
      )}

      {memberships.length > 1 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Skift mellem biografer aktiveres først, når
          adgangskontrol og sessionsscoping er klar.
        </p>
      )}
    </section>
  );
}
