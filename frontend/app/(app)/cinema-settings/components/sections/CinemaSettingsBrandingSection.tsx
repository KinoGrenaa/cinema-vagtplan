"use client";

import { useRef, type ChangeEvent } from "react";
import type { Cinema } from "../../helpers/core/cinemaSettingsTypes";
import { getLogoSrc } from "../../helpers/core/cinemaSettingsBrandingHelpers";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
        Branding
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Upload biografens logo. Logoet vises for MASTER, når biografen er
        valgt som aktiv biograf.
      </p>

      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
          {cinema.logoUrl ? (
            <img
              src={getLogoSrc(cinema.logoUrl)}
              alt={`${cinema.name} logo`}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <span className="px-3 text-center text-sm text-slate-500 dark:text-slate-400">
              Intet logo
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-offset-slate-900"
            >
              Upload logo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              tabIndex={-1}
              disabled={saving}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0] || null;
                void uploadCinemaLogo(file);
                event.currentTarget.value = "";
              }}
            />

            {cinema.logoUrl ? (
              <button
                type="button"
                onClick={() => void removeCinemaLogo()}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 dark:active:bg-red-950/70 dark:focus-visible:ring-offset-slate-900"
              >
                Fjern logo
              </button>
            ) : null}
          </div>

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Tilladte filtyper: JPG, PNG og WEBP. Maks. 2 MB.
          </p>
        </div>
      </div>
    </section>
  );
}
