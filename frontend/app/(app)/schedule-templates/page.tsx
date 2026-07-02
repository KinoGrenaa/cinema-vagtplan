"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

type CurrentUser = {
  sub: number;
  email: string;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number | null;
};

type WeekParity = "ANY" | "EVEN" | "ODD";

type DayPeriod = {
  id: number;
  name: string;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

type JobFunction = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  dayPeriod?: DayPeriod | null;
};

type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  jobFunction: JobFunction;
  assignments?: Array<{
    id: number;
    user?: {
      id: number;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }>;
};

type TemplateDay = {
  id: number;
  weekday: number;
  isActive: boolean;
  note: string | null;
  sortOrder: number;
  jobFunctions: TemplateJobFunction[];
};

type ScheduleTemplate = {
  id: number;
  name: string;
  description: string | null;
  weekParity: WeekParity;
  startsOn: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
  days?: TemplateDay[];
};

type TemplateFormState = {
  name: string;
  description: string;
  weekParity: WeekParity;
  sortOrder: string;
};

type DayFormState = {
  isActive: boolean;
  note: string;
  sortOrder: string;
};

type JobFunctionFormState = {
  jobFunctionId: string;
  requiredCount: string;
  sortOrder: string;
  note: string;
};

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

const emptyTemplateForm: TemplateFormState = {
  name: "",
  description: "",
  weekParity: "ANY",
  sortOrder: "0",
};

const emptyJobFunctionForm: JobFunctionFormState = {
  jobFunctionId: "",
  requiredCount: "1",
  sortOrder: "0",
  note: "",
};

const weekdayOptions = [
  { value: 1, shortLabel: "Man", label: "Mandag" },
  { value: 2, shortLabel: "Tir", label: "Tirsdag" },
  { value: 3, shortLabel: "Ons", label: "Onsdag" },
  { value: 4, shortLabel: "Tor", label: "Torsdag" },
  { value: 5, shortLabel: "Fre", label: "Fredag" },
  { value: 6, shortLabel: "Lør", label: "Lørdag" },
  { value: 7, shortLabel: "Søn", label: "Søndag" },
];

function getCurrentUserFromToken(): CurrentUser | null {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload)) as CurrentUser;
  } catch {
    return null;
  }
}

function getSelectedMasterCinemaId() {
  const selectedCinemaId = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));
  if (!Number.isFinite(selectedCinemaId) || selectedCinemaId <= 0) {
    return null;
  }
  return selectedCinemaId;
}

function appendCinemaId(path: string, cinemaId: number | null) {
  if (!cinemaId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cinemaId=${cinemaId}`;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data?.message)) return data.message.join("\n");
  return fallback;
}

function minuteToTime(value: number) {
  const safeValue = Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value), 0), 1439)
    : 0;
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDayPeriod(dayPeriod: DayPeriod | null | undefined) {
  if (!dayPeriod) return "Ingen dagsperiode";
  return `${dayPeriod.name} · kl. ${minuteToTime(dayPeriod.startMinute)}-${minuteToTime(
    dayPeriod.endMinute,
  )}`;
}

function formatWeekParity(value: WeekParity) {
  if (value === "EVEN") return "Kun lige uger";
  if (value === "ODD") return "Kun ulige uger";
  return "Alle uger";
}

function formatWeekday(value: number) {
  return weekdayOptions.find((weekday) => weekday.value === value)?.label ?? "Ukendt dag";
}

function getTemplateDay(template: ScheduleTemplate | null, weekday: number) {
  return template?.days?.find((day) => day.weekday === weekday) ?? null;
}

function getTemplateJobFunctionCount(template: ScheduleTemplate) {
  return (template.days ?? []).reduce(
    (sum, day) => sum + day.jobFunctions.reduce((daySum, item) => daySum + item.requiredCount, 0),
    0,
  );
}

function parseTemplateForm(form: TemplateFormState) {
  const name = form.name.trim();
  const description = form.description.trim() || null;
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!name) {
    throw new Error("Indtast et navn på vagtsskabelonen.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    name,
    description,
    weekParity: form.weekParity,
    sortOrder,
  };
}

function toTemplateForm(template: ScheduleTemplate): TemplateFormState {
  return {
    name: template.name,
    description: template.description ?? "",
    weekParity: template.weekParity,
    sortOrder: String(template.sortOrder ?? 0),
  };
}

function toDayForm(day: TemplateDay | null): DayFormState {
  return {
    isActive: day?.isActive ?? true,
    note: day?.note ?? "",
    sortOrder: String(day?.sortOrder ?? 0),
  };
}

function parseDayForm(form: DayFormState) {
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    isActive: form.isActive,
    note: form.note.trim() || null,
    sortOrder,
  };
}

function parseJobFunctionForm(form: JobFunctionFormState) {
  const jobFunctionId = Number(form.jobFunctionId);
  const requiredCount = form.requiredCount.trim() ? Number(form.requiredCount) : 1;
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!Number.isInteger(jobFunctionId) || jobFunctionId <= 0) {
    throw new Error("Vælg en jobfunktion.");
  }

  if (!Number.isInteger(requiredCount) || requiredCount <= 0 || requiredCount > 50) {
    throw new Error("Antal vagter skal være mellem 1 og 50.");
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Sortering skal være et gyldigt tal.");
  }

  return {
    jobFunctionId,
    requiredCount,
    sortOrder,
    note: form.note.trim() || null,
  };
}

export default function ScheduleTemplatesPage() {
  const infoDialog = useInfoModal();
  const infoDialogRef = useRef(infoDialog);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedWeekday, setSelectedWeekday] = useState(1);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm);
  const [dayForm, setDayForm] = useState<DayFormState>(toDayForm(null));
  const [jobFunctionForm, setJobFunctionForm] =
    useState<JobFunctionFormState>(emptyJobFunctionForm);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savingJobFunction, setSavingJobFunction] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(false);

  useEffect(() => {
    infoDialogRef.current = infoDialog;
  }, [infoDialog]);

  const activeCinemaId = useMemo(() => {
    if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }
    return currentUser?.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === selectedTemplateId) ?? null;
  }, [selectedTemplateId, templates]);

  const selectedDay = useMemo(() => {
    return getTemplateDay(selectedTemplate, selectedWeekday);
  }, [selectedTemplate, selectedWeekday]);

  const activeTemplates = templates.filter((template) => template.isActive).length;
  const archivedTemplates = templates.length - activeTemplates;

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());

    const updateSelectedCinema = () => {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    };

    updateSelectedCinema();
    window.addEventListener("masterSelectedCinemaChanged", updateSelectedCinema);
    window.addEventListener("storage", updateSelectedCinema);

    return () => {
      window.removeEventListener("masterSelectedCinemaChanged", updateSelectedCinema);
      window.removeEventListener("storage", updateSelectedCinema);
    };
  }, []);

  useEffect(() => {
    setTemplateForm(selectedTemplate ? toTemplateForm(selectedTemplate) : emptyTemplateForm);
    setEditingTemplate(false);
  }, [selectedTemplate]);

  useEffect(() => {
    setDayForm(toDayForm(selectedDay));
    setJobFunctionForm(emptyJobFunctionForm);
  }, [selectedDay, selectedWeekday]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesResponse, jobFunctionsResponse] = await Promise.all([
        apiFetch(
          appendCinemaId(
            `/schedule-templates?includeArchived=${showArchived}`,
            activeCinemaId,
          ),
        ),
        apiFetch(appendCinemaId("/job-functions?includeArchived=false", activeCinemaId)),
      ]);

      if (!templatesResponse.ok) {
        throw new Error(
          await readErrorMessage(templatesResponse, "Kunne ikke hente vagtsskabeloner"),
        );
      }

      if (!jobFunctionsResponse.ok) {
        throw new Error(
          await readErrorMessage(jobFunctionsResponse, "Kunne ikke hente jobfunktioner"),
        );
      }

      const [templatesData, jobFunctionsData] = await Promise.all([
        templatesResponse.json(),
        jobFunctionsResponse.json(),
      ]);

      const nextTemplates = Array.isArray(templatesData) ? templatesData : [];
      setTemplates(nextTemplates as ScheduleTemplate[]);
      setJobFunctions(
        Array.isArray(jobFunctionsData)
          ? (jobFunctionsData as JobFunction[]).filter((jobFunction) => jobFunction.isActive)
          : [],
      );

      setSelectedTemplateId((current) => {
        if (current && nextTemplates.some((template: ScheduleTemplate) => template.id === current)) {
          return current;
        }
        return nextTemplates[0]?.id ?? null;
      });
    } catch (error) {
      setTemplates([]);
      setJobFunctions([]);
      infoDialogRef.current.showError(
        "Kunne ikke hente vagtsskabeloner",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagtsskabeloner skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, showArchived]);

  useEffect(() => {
    if (!currentUser) return;

    if (needsMasterCinemaSelection) {
      setTemplates([]);
      setJobFunctions([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

  const createTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (needsMasterCinemaSelection) {
      infoDialog.showError(
        "Biograf mangler",
        "Vælg først en biograf i MASTER-panelet, før du opretter vagtsskabeloner.",
      );
      return;
    }

    try {
      setSavingTemplate(true);
      const payload = {
        ...parseTemplateForm(templateForm),
        cinemaId: activeCinemaId,
      };
      const response = await apiFetch("/schedule-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke oprette vagtsskabelon"));
      }

      const createdTemplate = (await response.json()) as ScheduleTemplate;
      await fetchData();
      setSelectedTemplateId(createdTemplate.id);
      setTemplateForm(emptyTemplateForm);
      infoDialog.show({
        title: "Vagtsskabelon oprettet",
        description:
          "Skabelonen er oprettet. Vælg ugedage og tilføj jobfunktioner, før den bruges i vagtplanlægningen.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const updateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setSavingTemplate(true);
      const payload = {
        ...parseTemplateForm(templateForm),
        cinemaId: activeCinemaId,
      };
      const response = await apiFetch(
        appendCinemaId(`/schedule-templates/${selectedTemplate.id}`, activeCinemaId),
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke opdatere vagtsskabelon"));
      }

      await fetchData();
      setEditingTemplate(false);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const archiveTemplate = async (template: ScheduleTemplate) => {
    if (!window.confirm(`Vil du arkivere vagtsskabelonen "${template.name}"?`)) return;

    try {
      const response = await apiFetch(
        appendCinemaId(`/schedule-templates/${template.id}`, activeCinemaId),
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke arkivere vagtsskabelon"));
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke arkivere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    }
  };

  const reactivateTemplate = async (template: ScheduleTemplate) => {
    try {
      const response = await apiFetch(
        appendCinemaId(`/schedule-templates/${template.id}/reactivate`, activeCinemaId),
        { method: "PATCH" },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke genaktivere vagtsskabelon"));
      }

      await fetchData();
      setSelectedTemplateId(template.id);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke genaktivere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    }
  };

  const saveSelectedDay = async () => {
    if (!selectedTemplate) return;

    try {
      setSavingDay(true);
      const payload = {
        ...parseDayForm(dayForm),
        cinemaId: activeCinemaId,
      };
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/days/${selectedWeekday}`,
          activeCinemaId,
        ),
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke gemme ugedag"));
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme ugedag",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    } finally {
      setSavingDay(false);
    }
  };

  const addJobFunction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    try {
      setSavingJobFunction(true);
      const payload = {
        ...parseJobFunctionForm(jobFunctionForm),
        cinemaId: activeCinemaId,
      };
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/days/${selectedWeekday}/job-functions`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke tilføje jobfunktion"));
      }

      setJobFunctionForm(emptyJobFunctionForm);
      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke tilføje jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    } finally {
      setSavingJobFunction(false);
    }
  };

  const updateTemplateJobFunction = async (
    item: TemplateJobFunction,
    updates: Partial<Pick<TemplateJobFunction, "requiredCount" | "sortOrder" | "note">>,
  ) => {
    if (!selectedTemplate) return;

    try {
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/day-job-functions/${item.id}`,
          activeCinemaId,
        ),
        {
          method: "PATCH",
          body: JSON.stringify({
            jobFunctionId: item.jobFunctionId,
            requiredCount: updates.requiredCount ?? item.requiredCount,
            sortOrder: updates.sortOrder ?? item.sortOrder,
            note: updates.note ?? item.note,
            cinemaId: activeCinemaId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke opdatere jobfunktion"));
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    }
  };

  const removeTemplateJobFunction = async (item: TemplateJobFunction) => {
    if (!selectedTemplate) return;
    if (!window.confirm(`Vil du fjerne "${item.jobFunction.name}" fra ${formatWeekday(selectedWeekday)}?`)) {
      return;
    }

    try {
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/day-job-functions/${item.id}`,
          activeCinemaId,
        ),
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke fjerne jobfunktion"));
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl. Prøv igen.",
      );
    }
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 p-4 text-gray-950 dark:bg-gray-950 dark:text-gray-100 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">
              Vagtplanlægning
            </p>
            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight">Vagtsskabeloner</h1>
                <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
                  Opret de skabeloner, der senere kan vælges på konkrete datoer i
                  vagtplanlægningen. En skabelon består af ugedage og jobfunktioner.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchData}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                disabled={loading || needsMasterCinemaSelection}
              >
                Opdater vagtsskabeloner
              </button>
            </div>
          </section>

          {needsMasterCinemaSelection && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Ingen aktiv biograf valgt</p>
              <h2 className="mt-2 text-2xl font-black">Vælg biograf før vagtsskabeloner</h2>
              <p className="mt-2 text-sm">
                MASTER skal vælge en aktiv biograf, før vagtsskabeloner kan oprettes eller
                redigeres. Skabelonerne knyttes til den valgte biograf og bruges i
                vagtplanlægningen.
              </p>
              <a
                href="/master"
                className="mt-4 inline-flex rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-700"
              >
                Vælg biograf
              </a>
            </section>
          )}

          {!needsMasterCinemaSelection && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Vist
                  </p>
                  <p className="mt-2 text-3xl font-black">{templates.length}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Aktive
                  </p>
                  <p className="mt-2 text-3xl font-black">{activeTemplates}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Arkiverede
                  </p>
                  <p className="mt-2 text-3xl font-black">{archivedTemplates}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Jobfunktioner
                  </p>
                  <p className="mt-2 text-3xl font-black">{jobFunctions.length}</p>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                          Stamdata
                        </p>
                        <h2 className="text-xl font-black">Opret vagtsskabelon</h2>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={showArchived}
                          onChange={(event) => setShowArchived(event.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Vis arkiverede
                      </label>
                    </div>

                    <form className="mt-4 space-y-3" onSubmit={createTemplate}>
                      <label className="block text-sm font-semibold">
                        Navn
                        <input
                          value={templateForm.name}
                          onChange={(event) =>
                            setTemplateForm((current) => ({ ...current, name: event.target.value }))
                          }
                          className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          placeholder="Fx Normal hverdag"
                          disabled={savingTemplate}
                        />
                      </label>
                      <label className="block text-sm font-semibold">
                        Beskrivelse
                        <textarea
                          value={templateForm.description}
                          onChange={(event) =>
                            setTemplateForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className="mt-1 min-h-24 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          placeholder="Kort note om hvornår skabelonen bruges."
                          disabled={savingTemplate}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-semibold">
                          Ugeregel
                          <select
                            value={templateForm.weekParity}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                weekParity: event.target.value as WeekParity,
                              }))
                            }
                            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            disabled={savingTemplate}
                          >
                            <option value="ANY">Alle uger</option>
                            <option value="EVEN">Kun lige uger</option>
                            <option value="ODD">Kun ulige uger</option>
                          </select>
                        </label>
                        <label className="block text-sm font-semibold">
                          Sortering
                          <input
                            type="number"
                            min="0"
                            value={templateForm.sortOrder}
                            onChange={(event) =>
                              setTemplateForm((current) => ({
                                ...current,
                                sortOrder: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            disabled={savingTemplate}
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={savingTemplate}
                      >
                        {savingTemplate ? "Gemmer..." : "Opret vagtsskabelon"}
                      </button>
                    </form>
                  </section>

                  <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="text-xl font-black">Vagtsskabeloner</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Vælg en skabelon for at redigere ugedage og jobfunktioner.
                    </p>

                    <div className="mt-4 space-y-3">
                      {loading && <p className="text-sm text-gray-500">Henter vagtsskabeloner...</p>}
                      {!loading && templates.length === 0 && (
                        <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                          Der er endnu ingen vagtsskabeloner for den valgte biograf.
                        </p>
                      )}
                      {templates.map((template) => {
                        const selected = selectedTemplateId === template.id;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(template.id)}
                            className={`w-full rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                                : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-black">{template.name}</p>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  {formatWeekParity(template.weekParity)} · {template.days?.length ?? 0} ugedage · {getTemplateJobFunctionCount(template)} vagter
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-bold ${
                                  template.isActive
                                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                                    : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {template.isActive ? "Aktiv" : "Arkiveret"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  {!selectedTemplate && (
                    <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                      Opret eller vælg en vagtsskabelon for at redigere ugedage og jobfunktioner.
                    </div>
                  )}

                  {selectedTemplate && (
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                            Valgt skabelon
                          </p>
                          <h2 className="text-2xl font-black">{selectedTemplate.name}</h2>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {selectedTemplate.description || "Ingen beskrivelse"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.isActive ? (
                            <button
                              type="button"
                              onClick={() => archiveTemplate(selectedTemplate)}
                              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                            >
                              Arkivér
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reactivateTemplate(selectedTemplate)}
                              className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                            >
                              Genaktivér
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingTemplate((current) => !current)}
                            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            {editingTemplate ? "Luk stamdata" : "Redigér stamdata"}
                          </button>
                        </div>
                      </div>

                      {editingTemplate && (
                        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <label className="block text-sm font-semibold">
                              Navn
                              <input
                                value={templateForm.name}
                                onChange={(event) =>
                                  setTemplateForm((current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </label>
                            <label className="block text-sm font-semibold">
                              Ugeregel
                              <select
                                value={templateForm.weekParity}
                                onChange={(event) =>
                                  setTemplateForm((current) => ({
                                    ...current,
                                    weekParity: event.target.value as WeekParity,
                                  }))
                                }
                                className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              >
                                <option value="ANY">Alle uger</option>
                                <option value="EVEN">Kun lige uger</option>
                                <option value="ODD">Kun ulige uger</option>
                              </select>
                            </label>
                            <label className="block text-sm font-semibold lg:col-span-2">
                              Beskrivelse
                              <textarea
                                value={templateForm.description}
                                onChange={(event) =>
                                  setTemplateForm((current) => ({
                                    ...current,
                                    description: event.target.value,
                                  }))
                                }
                                className="mt-1 min-h-20 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={updateTemplate}
                            className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                            disabled={savingTemplate}
                          >
                            {savingTemplate ? "Gemmer..." : "Gem stamdata"}
                          </button>
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-7">
                        {weekdayOptions.map((weekday) => {
                          const day = getTemplateDay(selectedTemplate, weekday.value);
                          const active = selectedWeekday === weekday.value;
                          return (
                            <button
                              key={weekday.value}
                              type="button"
                              onClick={() => setSelectedWeekday(weekday.value)}
                              className={`rounded-2xl border p-3 text-left text-sm transition ${
                                active
                                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                              }`}
                            >
                              <p className="font-black uppercase">{weekday.shortLabel}</p>
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                {day?.isActive ? "Aktiv" : "Ikke sat"}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {day?.jobFunctions?.length ?? 0} jobfunktioner
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                              Ugedag
                            </p>
                            <h3 className="text-xl font-black">{formatWeekday(selectedWeekday)}</h3>
                          </div>
                          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold dark:border-gray-800 dark:bg-gray-900">
                            <input
                              type="checkbox"
                              checked={dayForm.isActive}
                              onChange={(event) =>
                                setDayForm((current) => ({
                                  ...current,
                                  isActive: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            Aktiv ugedag i skabelonen
                          </label>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_140px]">
                          <label className="block text-sm font-semibold">
                            Note
                            <input
                              value={dayForm.note}
                              onChange={(event) =>
                                setDayForm((current) => ({ ...current, note: event.target.value }))
                              }
                              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              placeholder="Fx lukket dag eller særlig bemanding"
                            />
                          </label>
                          <label className="block text-sm font-semibold">
                            Sortering
                            <input
                              type="number"
                              min="0"
                              value={dayForm.sortOrder}
                              onChange={(event) =>
                                setDayForm((current) => ({
                                  ...current,
                                  sortOrder: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={saveSelectedDay}
                          className="mt-3 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                          disabled={savingDay}
                        >
                          {savingDay ? "Gemmer..." : "Gem ugedag"}
                        </button>
                      </div>

                      <div className="rounded-3xl border border-gray-200 p-4 dark:border-gray-800">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                            Jobfunktioner på {formatWeekday(selectedWeekday).toLowerCase()}
                          </p>
                          <h3 className="text-xl font-black">Vagter fra skabelonen</h3>
                        </div>

                        <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_130px_130px]" onSubmit={addJobFunction}>
                          <label className="block text-sm font-semibold">
                            Jobfunktion
                            <select
                              value={jobFunctionForm.jobFunctionId}
                              onChange={(event) =>
                                setJobFunctionForm((current) => ({
                                  ...current,
                                  jobFunctionId: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              disabled={savingJobFunction || jobFunctions.length === 0}
                            >
                              <option value="">Vælg jobfunktion</option>
                              {jobFunctions.map((jobFunction) => (
                                <option key={jobFunction.id} value={jobFunction.id}>
                                  {jobFunction.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm font-semibold">
                            Antal vagter
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={jobFunctionForm.requiredCount}
                              onChange={(event) =>
                                setJobFunctionForm((current) => ({
                                  ...current,
                                  requiredCount: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              disabled={savingJobFunction}
                            />
                          </label>
                          <label className="block text-sm font-semibold">
                            Sortering
                            <input
                              type="number"
                              min="0"
                              value={jobFunctionForm.sortOrder}
                              onChange={(event) =>
                                setJobFunctionForm((current) => ({
                                  ...current,
                                  sortOrder: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              disabled={savingJobFunction}
                            />
                          </label>
                          <label className="block text-sm font-semibold lg:col-span-3">
                            Note
                            <input
                              value={jobFunctionForm.note}
                              onChange={(event) =>
                                setJobFunctionForm((current) => ({
                                  ...current,
                                  note: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              placeholder="Valgfri note til jobfunktionen i denne skabelon"
                              disabled={savingJobFunction}
                            />
                          </label>
                          <button
                            type="submit"
                            className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 lg:col-span-3"
                            disabled={savingJobFunction || jobFunctions.length === 0}
                          >
                            {savingJobFunction ? "Tilføjer..." : "Tilføj jobfunktion"}
                          </button>
                        </form>

                        {jobFunctions.length === 0 && (
                          <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                            Der er ingen aktive jobfunktioner. Opret jobfunktioner, før de kan bruges i
                            vagtsskabeloner.
                          </p>
                        )}

                        <div className="mt-5 space-y-3">
                          {(selectedDay?.jobFunctions ?? []).length === 0 && (
                            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                              Der er ingen jobfunktioner på {formatWeekday(selectedWeekday).toLowerCase()} endnu.
                            </p>
                          )}
                          {(selectedDay?.jobFunctions ?? []).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: item.jobFunction.color || "#2563eb" }}
                                    />
                                    <p className="font-black">{item.jobFunction.name}</p>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                    {formatDayPeriod(item.jobFunction.dayPeriod)}
                                  </p>
                                  {item.note && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.note}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTemplateJobFunction(item)}
                                  className="rounded-2xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700"
                                >
                                  Fjern
                                </button>
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <label className="block text-sm font-semibold">
                                  Antal vagter
                                  <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    defaultValue={item.requiredCount}
                                    onBlur={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (
                                        Number.isInteger(nextValue) &&
                                        nextValue > 0 &&
                                        nextValue !== item.requiredCount
                                      ) {
                                        updateTemplateJobFunction(item, { requiredCount: nextValue });
                                      }
                                    }}
                                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                  />
                                </label>
                                <label className="block text-sm font-semibold">
                                  Sortering
                                  <input
                                    type="number"
                                    min="0"
                                    defaultValue={item.sortOrder}
                                    onBlur={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (
                                        Number.isInteger(nextValue) &&
                                        nextValue >= 0 &&
                                        nextValue !== item.sortOrder
                                      ) {
                                        updateTemplateJobFunction(item, { sortOrder: nextValue });
                                      }
                                    }}
                                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                  />
                                </label>
                                <label className="block text-sm font-semibold sm:col-span-3">
                                  Note
                                  <input
                                    defaultValue={item.note ?? ""}
                                    onBlur={(event) => {
                                      const nextValue = event.target.value.trim() || null;
                                      if (nextValue !== (item.note ?? null)) {
                                        updateTemplateJobFunction(item, { note: nextValue });
                                      }
                                    }}
                                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                  />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </section>
            </>
          )}
        </div>
      </main>
      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </AdminGuard>
  );
}
