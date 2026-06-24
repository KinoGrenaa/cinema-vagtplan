import type { Cinema } from "../helpers/cinemaSettingsTypes";
import { getLogoSrc } from "../helpers/cinemaSettingsHelpers";

type CinemaSettingsBrandingSectionProps = {
  cinema: Cinema;
  saving: boolean;
  uploadCinemaLogo: (file: File | null) => void | Promise<void>;
  removeCinemaLogo: () => void | Promise<void>;
};

export default function CinemaSettingsBrandingSection({
  cinema,
  saving,
  uploadCinemaLogo,
  removeCinemaLogo,
}: CinemaSettingsBrandingSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-2xl font-bold">Branding</h2>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Upload biografens logo. Logoet vises for MASTER, når biografen er valgt
        som aktiv biograf.
      </p>

      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
          {cinema.logoUrl ? (
            <img
              src={getLogoSrc(cinema.logoUrl)}
              alt={`${cinema.name} logo`}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <span className="px-3 text-center text-sm text-gray-500 dark:text-gray-400">
              Intet logo
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="inline-flex cursor-pointer rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
            Upload logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={saving}
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                uploadCinemaLogo(file);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {cinema.logoUrl ? (
            <button
              type="button"
              onClick={removeCinemaLogo}
              disabled={saving}
              className="ml-0 inline-flex rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 md:ml-3"
            >
              Fjern logo
            </button>
          ) : null}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tilladte filtyper: JPG, PNG og WEBP. Maks. 2 MB.
          </p>
        </div>
      </div>
    </section>
  );
}
