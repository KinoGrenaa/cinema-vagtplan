"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "@/app/lib/api";
import type { Cinema } from "../../helpers/core/masterTypes";

type CinemaModule = {
  key: string;
  name: string;
  description: string;
  group: string;
  billingBasis: string;
  enabled: boolean;
  updatedAt?: string | null;
};

type CinemaModulesResponse = {
  cinema: Cinema;
  modules: CinemaModule[];
};

type MasterCinemaModulesSectionProps = {
  cinema: Cinema | null;
  onClose: () => void;
};

const groupLabels: Record<
  string,
  string
> = {
  PLANLÆGNING: "Planlægning",
  TID_OG_LØN: "Tid og løn",
  MEDARBEJDERE: "Medarbejdere",
  KOMMUNIKATION: "Kommunikation",
  AI: "AI",
};

async function readErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {}

  return fallback;
}

export default function MasterCinemaModulesSection({
  cinema,
  onClose,
}: MasterCinemaModulesSectionProps) {
  const [
    modules,
    setModules,
  ] = useState<CinemaModule[]>([]);
  const [
    initialModules,
    setInitialModules,
  ] = useState<CinemaModule[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!cinema) {
      setModules([]);
      setInitialModules([]);
      setError("");
      setMessage("");
      return;
    }

    const cinemaId = cinema.id;
    let cancelled = false;

    async function fetchModules() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const response = await apiFetch(
          `/cinema-modules/${cinemaId}`,
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke hente modulindstillinger.",
            ),
          );
        }

        const data =
          (await response.json()) as CinemaModulesResponse;

        if (cancelled) {
          return;
        }

        setModules(data.modules);
        setInitialModules(
          data.modules,
        );
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Kunne ikke hente modulindstillinger.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchModules();

    return () => {
      cancelled = true;
    };
  }, [cinema]);

  const groupedModules = useMemo(() => {
    const groups = new Map<
      string,
      CinemaModule[]
    >();

    for (const module of modules) {
      const current =
        groups.get(module.group) ??
        [];
      current.push(module);
      groups.set(
        module.group,
        current,
      );
    }

    return [...groups.entries()];
  }, [modules]);

  const hasChanges = useMemo(() => {
    if (
      modules.length !==
      initialModules.length
    ) {
      return true;
    }

    const initialByKey = new Map(
      initialModules.map(
        (module) => [
          module.key,
          module.enabled,
        ],
      ),
    );

    return modules.some(
      (module) =>
        initialByKey.get(
          module.key,
        ) !== module.enabled,
    );
  }, [initialModules, modules]);

  const enabledCount =
    modules.filter(
      (module) => module.enabled,
    ).length;

  useEffect(() => {
    if (!cinema) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        if (
          hasChanges &&
          !window.confirm(
            "Der er ugemte modulændringer. Vil du lukke uden at gemme?",
          )
        ) {
          return;
        }

        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );
    const previousOverflow =
      document.body.style.overflow;
    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    cinema,
    hasChanges,
    onClose,
    saving,
  ]);

  function setAll(enabled: boolean) {
    setModules((current) =>
      current.map((module) => ({
        ...module,
        enabled,
      })),
    );
    setMessage("");
  }

  function toggleModule(
    moduleKey: string,
  ) {
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey
          ? {
              ...module,
              enabled:
                !module.enabled,
            }
          : module,
      ),
    );
    setMessage("");
  }

  function closeModal() {
    if (saving) {
      return;
    }

    if (
      hasChanges &&
      !window.confirm(
        "Der er ugemte modulændringer. Vil du lukke uden at gemme?",
      )
    ) {
      return;
    }

    onClose();
  }

  async function saveModules() {
    if (
      !cinema ||
      !hasChanges
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await apiFetch(
        `/cinema-modules/${cinema.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            modules: modules.map(
              (module) => ({
                key: module.key,
                enabled:
                  module.enabled,
              }),
            ),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke gemme modulindstillinger.",
          ),
        );
      }

      const data =
        (await response.json()) as CinemaModulesResponse;

      setModules(data.modules);
      setInitialModules(
        data.modules,
      );
      setMessage(
        `Modulindstillinger for ${data.cinema.name} er gemt.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Kunne ikke gemme modulindstillinger.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!cinema) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 md:p-6"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cinema-modules-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <header className="border-b border-gray-200 px-5 py-4 dark:border-gray-800 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                Modulstyring
              </p>
              <h2
                id="cinema-modules-title"
                className="mt-1 text-2xl font-bold"
              >
                {cinema.name}
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                Angiv hvilke moduler
                biografen skal have
                adgang til. Der gemmes
                endnu ingen priser.
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              disabled={saving}
              aria-label="Luk modulstyring"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xl font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-green-800 dark:border-green-900 dark:bg-green-950/35 dark:text-green-200">
              {enabledCount} aktive
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
              {modules.length -
                enabledCount}{" "}
              deaktiverede
            </span>
            {hasChanges && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200">
                Ikke gemt
              </span>
            )}

            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setAll(true)
                }
                disabled={
                  loading ||
                  modules.length === 0
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Aktivér alle
              </button>
              <button
                type="button"
                onClick={() =>
                  setAll(false)
                }
                disabled={
                  loading ||
                  modules.length === 0
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Deaktivér alle
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/35 dark:text-red-200"
            >
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/35 dark:text-green-200">
              {message}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Henter
              modulindstillinger...
            </div>
          ) : (
            <div className="space-y-5">
              {groupedModules.map(
                ([
                  group,
                  groupModules,
                ]) => (
                  <div key={group}>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {groupLabels[
                        group
                      ] ?? group}
                    </h3>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {groupModules.map(
                        (module) => (
                          <button
                            key={
                              module.key
                            }
                            type="button"
                            onClick={() =>
                              toggleModule(
                                module.key,
                              )
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              module.enabled
                                ? "border-green-300 bg-green-50 hover:border-green-500 dark:border-green-800 dark:bg-green-950/25"
                                : "border-gray-300 bg-gray-50 hover:border-gray-500 dark:border-gray-700 dark:bg-gray-950"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="font-bold text-gray-950 dark:text-white">
                                  {
                                    module.name
                                  }
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                  {
                                    module.description
                                  }
                                </p>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  Fremtidigt
                                  faktureringsgrundlag:
                                  pr. biograf
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                                  module.enabled
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                                }`}
                              >
                                {module.enabled
                                  ? "Aktiv"
                                  : "Inaktiv"}
                              </span>
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-gray-800 md:px-6">
          <button
            type="button"
            onClick={closeModal}
            disabled={saving}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Luk
          </button>
          <button
            type="button"
            onClick={saveModules}
            disabled={
              saving ||
              loading ||
              !hasChanges
            }
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Gemmer..."
              : "Gem moduler"}
          </button>
        </footer>
      </section>
    </div>
  );
}
