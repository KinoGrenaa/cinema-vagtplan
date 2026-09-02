"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import CinemaSettingsSwitch from "../layout/CinemaSettingsSwitch";
import type {
  AutomaticTimeRegistrationMethod,
  Cinema,
  CinemaSettingsUpdate,
} from "../../helpers/core/cinemaSettingsTypes";

type Props = {
  cinema: Cinema;
  saving: boolean;
  updateCinemaSettings: (
    changes: CinemaSettingsUpdate,
  ) => void | Promise<void>;
};

const dateTimeFormatter =
  new Intl.DateTimeFormat(
    "da-DK",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Copenhagen",
    },
  );

function getInitialMinutes(
  cinema: Cinema,
) {
  return String(
    cinema.automaticTimeRegistrationMinutes > 0
      ? cinema.automaticTimeRegistrationMinutes
      : 240,
  );
}

export default function CinemaSettingsTimeRegistrationSection({
  cinema,
  saving,
  updateCinemaSettings,
}: Props) {
  const [
    enabled,
    setEnabled,
  ] = useState(
    cinema.automaticTimeRegistrationEnabled,
  );

  const [
    method,
    setMethod,
  ] =
    useState<AutomaticTimeRegistrationMethod>(
      cinema.automaticTimeRegistrationMethod,
    );

  const [
    minutes,
    setMinutes,
  ] = useState(
    getInitialMinutes(cinema),
  );

  const [
    validationError,
    setValidationError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setEnabled(
      cinema.automaticTimeRegistrationEnabled,
    );

    setMethod(
      cinema.automaticTimeRegistrationMethod,
    );

    setMinutes(
      getInitialMinutes(cinema),
    );

    setValidationError(null);
  }, [
    cinema.automaticTimeRegistrationEnabled,
    cinema.automaticTimeRegistrationMethod,
    cinema.automaticTimeRegistrationMinutes,
    cinema.automaticTimeRegistrationActiveFrom,
  ]);

  const parsedMinutes =
    Number(minutes);

  const validMinutes =
    Number.isInteger(parsedMinutes) &&
    parsedMinutes >= 1 &&
    parsedMinutes <= 1440;

  const persistedMinutes =
    cinema.automaticTimeRegistrationMinutes > 0
      ? cinema.automaticTimeRegistrationMinutes
      : 240;

  const configurationChanged =
    method !==
      cinema.automaticTimeRegistrationMethod ||
    (
      method === "FIXED_MINUTES" &&
      validMinutes &&
      parsedMinutes !==
        persistedMinutes
    );

  const hasChanges =
    enabled !==
      cinema.automaticTimeRegistrationEnabled ||
    configurationChanged;

  const activeFromText =
    useMemo(() => {
      if (
        !cinema.automaticTimeRegistrationActiveFrom
      ) {
        return null;
      }

      return dateTimeFormatter.format(
        new Date(
          cinema.automaticTimeRegistrationActiveFrom,
        ),
      );
    }, [
      cinema.automaticTimeRegistrationActiveFrom,
    ]);

  const methodValidFromText =
    useMemo(() => {
      if (
        !cinema.automaticTimeRegistrationMethodValidFrom
      ) {
        return null;
      }

      return dateTimeFormatter.format(
        new Date(
          cinema.automaticTimeRegistrationMethodValidFrom,
        ),
      );
    }, [
      cinema.automaticTimeRegistrationMethodValidFrom,
    ]);

  function selectMethod(
    nextMethod:
      AutomaticTimeRegistrationMethod,
  ) {
    setMethod(nextMethod);
    setValidationError(null);

    if (
      nextMethod ===
        "FIXED_MINUTES" &&
      !validMinutes
    ) {
      setMinutes("240");
    }
  }

  async function saveChanges() {
    if (
      method ===
        "FIXED_MINUTES" &&
      !validMinutes
    ) {
      setValidationError(
        "Angiv et helt antal minutter mellem 1 og 1440.",
      );

      return;
    }

    setValidationError(null);

    const changes:
      CinemaSettingsUpdate = {
        automaticTimeRegistrationEnabled:
          enabled,
        automaticTimeRegistrationMethod:
          method,
    };

    if (
      method ===
        "FIXED_MINUTES"
    ) {
      changes.automaticTimeRegistrationMinutes =
        parsedMinutes;
    }

    await updateCinemaSettings(
      changes,
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            Automatisk tidsregistrering
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {"Bestem hvordan systemet skal h\u00e5ndtere en tildelt vagt, hvis medarbejderen glemmer at registrere sin arbejdstid."}
          </p>
        </div>

        <CinemaSettingsSwitch
          checked={enabled}
          disabled={saving}
          ariaLabel="Aktivér automatisk tidsregistrering"
          onChange={(event) => {
            setEnabled(event.target.checked);
            setValidationError(null);
          }}
        />
      </div>

      {enabled && (
        <div className="mt-6 space-y-4">
          {cinema.automaticTimeRegistrationEnabled &&
          activeFromText ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p>
                {"Automatisk tidsregistrering har v\u00e6ret aktiv siden "}
                <span className="font-semibold">
                  {activeFromText}
                </span>
                .
              </p>

              {configurationChanged ? (
                <p className="mt-1">
                  {"De valgte indstillinger g\u00e6lder f\u00f8rst for vagter, der slutter fra det tidspunkt, du gemmer \u00e6ndringerne."}
                </p>
              ) : methodValidFromText ? (
                <p className="mt-1">
                  {"Den aktuelle metode g\u00e6lder for vagter, der slutter fra "}
                  <span className="font-semibold">
                    {methodValidFromText}
                  </span>
                  .
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              {"Automatikken aktiveres f\u00f8rst, n\u00e5r du gemmer \u00e6ndringerne."}
            </p>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-slate-950 dark:text-white">
              Hvis tidsregistreringen mangler
            </legend>

            <div className="mt-3 grid gap-3">
              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <input
                  type="radio"
                  name="automatic-time-registration-method"
                  checked={
                    method ===
                    "PLANNED_SHIFT"
                  }
                  disabled={saving}
                  onChange={() =>
                    selectMethod(
                      "PLANNED_SHIFT",
                    )
                  }
                  className="mt-1"
                />

                <span>
                  <span className="block font-semibold text-slate-950 dark:text-white">
                    Brug den planlagte vagts tider
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {"Mangler b\u00e5de m\u00f8detid og fyraften, bruges den planlagte start og slut. Mangler kun fyraften, bevares den faktiske m\u00f8detid, og den planlagte fyraften bruges."}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <input
                  type="radio"
                  name="automatic-time-registration-method"
                  checked={
                    method ===
                    "FIXED_MINUTES"
                  }
                  disabled={saving}
                  onChange={() =>
                    selectMethod(
                      "FIXED_MINUTES",
                    )
                  }
                  className="mt-1"
                />

                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-950 dark:text-white">
                    Brug fast arbejdstid
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {"Det valgte antal minutter regnes fra den faktiske m\u00f8detid, hvis den findes. Ellers regnes der fra vagtens planlagte start."}
                  </span>

                  {method ===
                    "FIXED_MINUTES" && (
                    <div className="mt-3 flex max-w-xs items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        step={1}
                        value={minutes}
                        disabled={saving}
                        onChange={(event) => {
                          setMinutes(
                            event.target.value,
                          );

                          setValidationError(
                            null,
                          );
                        }}
                        className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />

                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        minutter
                      </span>
                    </div>
                  )}
                </span>
              </label>
            </div>
          </fieldset>

          {validationError && (
            <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {validationError}
            </p>
          )}

          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {"Automatisk behandling sker f\u00f8rst ved det f\u00f8rste d\u00f8gnskifte efter vagtens planlagte sluttid. Automatisk udfyldte registreringer sendes til normal godkendelse og kan rettes af medarbejderen, indtil de er godkendt."}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        {hasChanges && (
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {"Ikke-gemte \u00e6ndringer"}
          </span>
        )}

        <button
          type="button"
          disabled={
            saving ||
            !hasChanges
          }
          onClick={() =>
            void saveChanges()
          }
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {saving
            ? "Gemmer..."
            : "Gem \u00e6ndringer"}
        </button>
      </div>
    </section>
  );
}
