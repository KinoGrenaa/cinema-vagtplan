"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import ShiftPlanningMasterCinemaRequired from "./components/ShiftPlanningMasterCinemaRequired";
import {
  addMonths,
  appendCinemaId,
  formatDateKey,
  formatTemplateLabel,
  formatWeekParity,
  getCalendarLeadingBlankCount,
  getCurrentUserFromToken,
  getDayStatusClasses,
  getDayStatusLabel,
  getMonthName,
  getMonthSummary,
  getSelectedMasterCinemaId,
  getWeekdayName,
  isToday,
  readErrorMessage,
} from "./helpers/shiftPlanningHelpers";
import type {
  CurrentUser,
  MonthPlanDay,
  MonthPlanResponse,
  ScheduleTemplateSummary,
} from "./helpers/shiftPlanningTypes";

type DayFormState = {
  isActive: boolean;
  scheduleTemplateId: string;
  note: string;
  movieShowingCount: string;
  plannedShiftCount: string;
  unassignedShiftCount: string;
};

const weekdayHeaders = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function getInitialMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function toDayForm(day: MonthPlanDay): DayFormState {
  return {
    isActive: day.isActive,
    scheduleTemplateId: day.scheduleTemplateId ? String(day.scheduleTemplateId) : "",
    note: day.note ?? "",
    movieShowingCount: String(day.movieShowingCount ?? 0),
    plannedShiftCount: String(day.plannedShiftCount ?? 0),
    unassignedShiftCount: String(day.unassignedShiftCount ?? 0),
  };
}

function parseNonNegativeInteger(value: string, fieldName: string) {
  const parsedValue = value.trim() ? Number(value) : 0;

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldName} skal være et positivt heltal.`);
  }

  return parsedValue;
}

function parseDayForm(form: DayFormState, activeCinemaId: number | null) {
  let scheduleTemplateId: number | null = null;

  if (form.isActive && form.scheduleTemplateId) {
    const parsedScheduleTemplateId = Number(form.scheduleTemplateId);

    if (
      !Number.isInteger(parsedScheduleTemplateId) ||
      parsedScheduleTemplateId <= 0
    ) {
      throw new Error("Vagtsskabelon skal være et gyldigt valg.");
    }

    scheduleTemplateId = parsedScheduleTemplateId;
  }

  return {
    cinemaId: activeCinemaId,
    isActive: form.isActive,
    scheduleTemplateId,
    note: form.note.trim() || null,
    movieShowingCount: parseNonNegativeInteger(
      form.movieShowingCount,
      "Antal forestillinger",
    ),
    plannedShiftCount: parseNonNegativeInteger(
      form.plannedShiftCount,
      "Antal vagter",
    ),
    unassignedShiftCount: parseNonNegativeInteger(
      form.unassignedShiftCount,
      "Ubesatte vagter",
    ),
  };
}

export default function ShiftPlanningPage() {
  const infoDialog = useInfoModal();
  const infoDialogRef = useRef(infoDialog);

  useEffect(() => {
    infoDialogRef.current = infoDialog;
  }, [infoDialog]);

  const initialMonth = useMemo(() => getInitialMonth(), []);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [year, setYear] = useState(initialMonth.year);
  const [month, setMonth] = useState(initialMonth.month);
  const [monthPlan, setMonthPlan] = useState<MonthPlanResponse | null>(null);
  const [templates, setTemplates] = useState<ScheduleTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<MonthPlanDay | null>(null);
  const [dayForm, setDayForm] = useState<DayFormState | null>(null);

  const activeCinemaId = useMemo(() => {
    if (currentUser?.role === "MASTER" && !currentUser.cinemaId) {
      return selectedMasterCinemaId;
    }

    return currentUser?.cinemaId ?? null;
  }, [currentUser, selectedMasterCinemaId]);

  const needsMasterCinemaSelection =
    currentUser?.role === "MASTER" && !currentUser.cinemaId && !activeCinemaId;

  const days = monthPlan?.days ?? [];
  const leadingBlankCount = getCalendarLeadingBlankCount(year, month);
  const monthSummary = getMonthSummary(days);

  useEffect(() => {
    setCurrentUser(getCurrentUserFromToken());

    const updateSelectedCinema = () => {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    };

    updateSelectedCinema();
    window.addEventListener("masterSelectedCinemaChanged", updateSelectedCinema);
    window.addEventListener("storage", updateSelectedCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
      window.removeEventListener("storage", updateSelectedCinema);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [monthResponse, templatesResponse] = await Promise.all([
        apiFetch(
          appendCinemaId(
            `/month-plans?year=${year}&month=${month}`,
            activeCinemaId,
          ),
        ),
        apiFetch(
          appendCinemaId(
            "/schedule-templates?includeArchived=false",
            activeCinemaId,
          ),
        ),
      ]);

      if (!monthResponse.ok) {
        throw new Error(
          await readErrorMessage(monthResponse, "Kunne ikke hente månedsplan"),
        );
      }

      if (!templatesResponse.ok) {
        throw new Error(
          await readErrorMessage(
            templatesResponse,
            "Kunne ikke hente vagtsskabeloner",
          ),
        );
      }

      const [monthData, templatesData] = await Promise.all([
        monthResponse.json(),
        templatesResponse.json(),
      ]);

      setMonthPlan(monthData as MonthPlanResponse);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (error) {
      setMonthPlan(null);
      setTemplates([]);
      infoDialogRef.current.showError(
        "Kunne ikke hente vagtplanlægning",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da månedsplanen skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeCinemaId, month, year]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (needsMasterCinemaSelection) {
      setMonthPlan(null);
      setTemplates([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

  const changeMonth = (delta: number) => {
    const nextMonth = addMonths(year, month, delta);
    setYear(nextMonth.year);
    setMonth(nextMonth.month);
    setSelectedDay(null);
    setDayForm(null);
  };

  const goToCurrentMonth = () => {
    const nextMonth = getInitialMonth();
    setYear(nextMonth.year);
    setMonth(nextMonth.month);
    setSelectedDay(null);
    setDayForm(null);
  };

  const openDayModal = (day: MonthPlanDay) => {
    setSelectedDay(day);
    setDayForm(toDayForm(day));
  };

  const closeDayModal = () => {
    if (saving) {
      return;
    }

    setSelectedDay(null);
    setDayForm(null);
  };

  const submitDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDay || !dayForm) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiFetch(
        appendCinemaId(`/month-plans/days/${selectedDay.dateKey}`, activeCinemaId),
        {
          method: "PATCH",
          body: JSON.stringify(parseDayForm(dayForm, activeCinemaId)),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke gemme planlægningsdag"),
        );
      }

      const updatedDay = (await response.json()) as MonthPlanDay;
      setMonthPlan((current) => {
        if (!current) return current;

        return {
          ...current,
          days: current.days.map((day) =>
            day.dateKey === updatedDay.dateKey ? updatedDay : day,
          ),
        };
      });
      setSelectedDay(updatedDay);
      setDayForm(toDayForm(updatedDay));

      infoDialog.show({
        title: "Planlægningsdag gemt",
        description: `Planen for ${formatDateKey(updatedDay.dateKey)} er gemt.`,
        variant: "success",
        buttonText: "OK",
      });
      closeDayModal();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke gemme planlægningsdag",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da planlægningsdagen skulle gemmes.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Vagtplanlægning
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Månedsplan
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
              Læg vagtsskabeloner på konkrete datoer. Der oprettes stadig ingen
              aktive vagter herfra — denne side forbereder månedens
              planlægningsgrundlag.
            </p>
          </header>

          {needsMasterCinemaSelection && <ShiftPlanningMasterCinemaRequired />}

          {!needsMasterCinemaSelection && (
            <>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Måned
                    </p>
                    <h2 className="mt-1 text-2xl font-bold capitalize">
                      {getMonthName(year, month)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Klik på en dato for at vælge skabelon, markere lukket dag
                      eller tilføje en intern note.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeMonth(-1)}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Forrige
                    </button>
                    <button
                      type="button"
                      onClick={goToCurrentMonth}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Denne måned
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMonth(1)}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Næste
                    </button>
                    <button
                      type="button"
                      onClick={fetchData}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Opdater
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Aktive dage
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {monthSummary.activeDays}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Med skabelon
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {monthSummary.daysWithTemplate}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Mangler skabelon
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {monthSummary.missingTemplateDays}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Inaktive dage
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {monthSummary.inactiveDays}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Ubesatte vagter
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {monthSummary.totalUnassigned}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                <div className="grid grid-cols-7 gap-2 border-b border-gray-200 pb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  {weekdayHeaders.map((weekday) => (
                    <div key={weekday}>{weekday}</div>
                  ))}
                </div>

                {loading && (
                  <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Henter månedsplan...
                  </div>
                )}

                {!loading && days.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    Ingen dage fundet for måneden.
                  </div>
                )}

                {!loading && days.length > 0 && (
                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {Array.from({ length: leadingBlankCount }).map((_, index) => (
                      <div key={`blank-${index}`} className="min-h-28" />
                    ))}

                    {days.map((day) => (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => openDayModal(day)}
                        className={`min-h-32 rounded-2xl border p-3 text-left transition hover:shadow-md ${getDayStatusClasses(
                          day,
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs capitalize opacity-80">
                              {getWeekdayName(day.dateKey)}
                            </p>
                            <p className="text-xl font-bold">
                              {Number(day.dateKey.slice(-2))}
                            </p>
                          </div>
                          {isToday(day.dateKey) && (
                            <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                              I dag
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-80">
                          {getDayStatusLabel(day)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold">
                          {day.isActive
                            ? formatTemplateLabel(day.scheduleTemplate)
                            : "Lukket / ingen plan"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1 text-xs opacity-85">
                          <span>{day.movieShowingCount ?? 0} forest.</span>
                          <span>·</span>
                          <span>{day.plannedShiftCount ?? 0} vagter</span>
                          <span>·</span>
                          <span>{day.unassignedShiftCount ?? 0} ubesatte</span>
                        </div>

                        {day.note && (
                          <p className="mt-2 line-clamp-2 text-xs opacity-80">
                            {day.note}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {selectedDay && dayForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Planlægningsdag
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {getWeekdayName(selectedDay.dateKey, "long")} {formatDateKey(selectedDay.dateKey)}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Vælg hvilken vagtsskabelon der skal bruges på denne dato.
                    Aktive vagter oprettes først i en senere fase.
                  </p>
                </div>
              </div>

              <form onSubmit={submitDay} className="mt-6 space-y-5">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={dayForm.isActive}
                    onChange={(event) =>
                      setDayForm((current) =>
                        current
                          ? {
                              ...current,
                              isActive: event.target.checked,
                              scheduleTemplateId: event.target.checked
                                ? current.scheduleTemplateId
                                : "",
                            }
                          : current,
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={saving}
                  />
                  <span>
                    <span className="block text-sm font-semibold">Aktiv planlægningsdag</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      Slå fra for lukkedage eller dage uden planlagt bemanding.
                    </span>
                  </span>
                </label>

                <div>
                  <label className="text-sm font-semibold" htmlFor="scheduleTemplateId">
                    Vagtsskabelon på denne dato
                  </label>
                  <select
                    id="scheduleTemplateId"
                    value={dayForm.scheduleTemplateId}
                    onChange={(event) =>
                      setDayForm((current) =>
                        current
                          ? { ...current, scheduleTemplateId: event.target.value }
                          : current,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    disabled={saving || !dayForm.isActive}
                  >
                    <option value="">Ingen skabelon</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} · {formatWeekParity(template.weekParity)}
                      </option>
                    ))}
                  </select>
                  {templates.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Der findes ingen aktive vagtsskabeloner endnu. Opret en
                      skabelon via backend/API eller kommende skabelon-UI, før du
                      kan lægge den på en dato.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold" htmlFor="note">
                    Intern note
                  </label>
                  <textarea
                    id="note"
                    value={dayForm.note}
                    onChange={(event) =>
                      setDayForm((current) =>
                        current ? { ...current, note: event.target.value } : current,
                      )
                    }
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder="Fx lukket dag, særlig bemanding eller afvigelse fra normal uge."
                    disabled={saving}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold" htmlFor="movieShowingCount">
                      Forestillinger
                    </label>
                    <input
                      id="movieShowingCount"
                      type="number"
                      min="0"
                      value={dayForm.movieShowingCount}
                      onChange={(event) =>
                        setDayForm((current) =>
                          current
                            ? { ...current, movieShowingCount: event.target.value }
                            : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold" htmlFor="plannedShiftCount">
                      Vagter
                    </label>
                    <input
                      id="plannedShiftCount"
                      type="number"
                      min="0"
                      value={dayForm.plannedShiftCount}
                      onChange={(event) =>
                        setDayForm((current) =>
                          current
                            ? { ...current, plannedShiftCount: event.target.value }
                            : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold" htmlFor="unassignedShiftCount">
                      Ubesatte
                    </label>
                    <input
                      id="unassignedShiftCount"
                      type="number"
                      min="0"
                      value={dayForm.unassignedShiftCount}
                      onChange={(event) =>
                        setDayForm((current) =>
                          current
                            ? { ...current, unassignedShiftCount: event.target.value }
                            : current,
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={closeDayModal}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                    disabled={saving}
                  >
                    Annuller
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? "Gemmer..." : "Gem dag"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={infoDialog.description}
          buttonText={infoDialog.buttonText}
          variant={infoDialog.variant}
          onClose={infoDialog.close}
        />
      </main>
    </AdminGuard>
  );
}
