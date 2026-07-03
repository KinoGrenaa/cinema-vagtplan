"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import ShiftPlanningDayCard from "./components/month/ShiftPlanningDayCard";
import ShiftPlanningTemplatePreview from "./components/template-preview/ShiftPlanningTemplatePreview";
import ShiftPlanningWeekIndicator from "./components/month/ShiftPlanningWeekIndicator";
import ShiftPlanningMissingTemplateOverview from "./components/month/ShiftPlanningMissingTemplateOverview";
import ShiftPlanningDraftPreview from "./components/draft-preview/ShiftPlanningDraftPreview";
import ShiftPlanningSavedDraftsOverview from "./components/saved-drafts/ShiftPlanningSavedDraftsOverview";
import ShiftPlanningMasterCinemaRequired from "./components/shared/ShiftPlanningMasterCinemaRequired";
import {
  addMonths,
  appendCinemaId,
  formatDateKey,
  getCalendarLeadingBlankCount,
  getDateWeekParityLabel,
  getCurrentUserFromToken,
  getMonthName,
  getMonthCalendarWeeks,
  getMonthPlanDayDateKey,
  getMonthSummary,
  getSelectedMasterCinemaId,
  getWeekdayName,
  isTemplateWeekParityCompatible,
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
  };
}

function normalizeMonthPlanDay(day: MonthPlanDay): MonthPlanDay {
  return {
    ...day,
    dateKey: getMonthPlanDayDateKey(day),
  };
}

function normalizeMonthPlanResponse(data: MonthPlanResponse): MonthPlanResponse {
  return {
    ...data,
    days: Array.isArray(data.days)
      ? data.days.map((day) => normalizeMonthPlanDay(day))
      : [],
  };
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
  const [savingWeekKey, setSavingWeekKey] = useState<string | null>(null);
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);
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
  const calendarWeeks = useMemo(
    () => getMonthCalendarWeeks(days, leadingBlankCount),
    [days, leadingBlankCount],
  );
  const missingTemplateDays = useMemo(
    () => days.filter((day) => day.isActive && !day.scheduleTemplateId),
    [days],
  );
  const plannedTemplateDays = useMemo(
    () => days.filter((day) => day.isActive && Boolean(day.scheduleTemplateId)),
    [days],
  );

  const templatesById = useMemo(() => {
    const map = new Map<number, ScheduleTemplateSummary>();

    templates.forEach((template) => {
      map.set(template.id, template);
    });

    return map;
  }, [templates]);

  const selectedDayDateKey = selectedDay ? getMonthPlanDayDateKey(selectedDay) : "";
  const selectedTemplateId = dayForm?.scheduleTemplateId
    ? Number(dayForm.scheduleTemplateId)
    : null;
  const selectedTemplate =
    selectedTemplateId && Number.isInteger(selectedTemplateId)
      ? templatesById.get(selectedTemplateId) ??
        (selectedDay?.scheduleTemplate?.id === selectedTemplateId
          ? selectedDay.scheduleTemplate
          : null)
      : null;
  const selectedDayWeekLabel = selectedDayDateKey
    ? getDateWeekParityLabel(selectedDayDateKey)
    : "Ukendt uge";

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
          appendCinemaId("/schedule-templates?includeArchived=false", activeCinemaId),
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

      setMonthPlan(normalizeMonthPlanResponse(monthData as MonthPlanResponse));
      setTemplates(
        Array.isArray(templatesData)
          ? (templatesData as ScheduleTemplateSummary[])
          : [],
      );
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

  const refreshMonthPlanAfterDraftPublish = useCallback(() => {
    void fetchData();
  }, [fetchData]);

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

  const applyTemplateToWeek = async (
    weekKey: string,
    weekDays: Array<MonthPlanDay | null>,
    scheduleTemplateIdText: string,
  ) => {
    const parsedScheduleTemplateId = Number(scheduleTemplateIdText);

    if (
      !Number.isInteger(parsedScheduleTemplateId) ||
      parsedScheduleTemplateId <= 0
    ) {
      infoDialog.showError(
        "V\u00e6lg vagtsskabelon",
        "V\u00e6lg en vagtsskabelon, f\u00f8r den anvendes p\u00e5 ugen.",
      );
      return;
    }

    const today = new Date();
    const todayDateKey = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const activeWeekDays = weekDays.filter((day): day is MonthPlanDay => {
      if (!day?.isActive) {
        return false;
      }

      const dateKey = getMonthPlanDayDateKey(day);
      return Boolean(dateKey) && dateKey >= todayDateKey;
    });

    if (activeWeekDays.length === 0) {
      infoDialog.showError(
        "Ingen fremtidige aktive dage",
        "Ugen har ingen aktive planl\u00e6gningsdage i dag eller frem, som skabelonen kan l\u00e6gges p\u00e5.",
      );
      return;
    }

    try {
      setSavingWeekKey(weekKey);

      const updatedDays = await Promise.all(
        activeWeekDays.map(async (day) => {
          const dateKey = getMonthPlanDayDateKey(day);

          if (!dateKey) {
            throw new Error("En planl\u00e6gningsdag i ugen mangler en gyldig dato.");
          }

          const response = await apiFetch(
            appendCinemaId(`/month-plans/days/${dateKey}`, activeCinemaId),
            {
              method: "PATCH",
              body: JSON.stringify(
                parseDayForm(
                  {
                    ...toDayForm(day),
                    isActive: true,
                    scheduleTemplateId: String(parsedScheduleTemplateId),
                  },
                  activeCinemaId,
                ),
              ),
            },
          );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                `Kunne ikke gemme planl\u00e6gningsdagen ${formatDateKey(dateKey)}`,
              ),
            );
          }

          return normalizeMonthPlanDay((await response.json()) as MonthPlanDay);
        }),
      );

      const updatedDaysByDateKey = new Map(
        updatedDays.map((day) => [getMonthPlanDayDateKey(day), day]),
      );

      setMonthPlan((current) => {
        if (!current) return current;

        return {
          ...current,
          days: current.days.map(
            (day) => updatedDaysByDateKey.get(getMonthPlanDayDateKey(day)) ?? day,
          ),
        };
      });

      infoDialog.show({
        title: "Vagtsskabelon anvendt p\u00e5 uge",
        description: `Vagtsskabelonen er lagt p\u00e5 ${updatedDays.length} aktive dage i ugen fra i dag og frem.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke anvende vagtsskabelon p\u00e5 uge",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagtsskabelonen skulle l\u00e6gges p\u00e5 ugen.",
      );
    } finally {
      setSavingWeekKey(null);
    }
  };
  const submitDay = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedDay || !dayForm) {
      return;
    }

    try {
      setSaving(true);

      const selectedDayDateKey = getMonthPlanDayDateKey(selectedDay);

      if (!selectedDayDateKey) {
        throw new Error("Planlægningsdagen mangler en gyldig dato.");
      }

      const response = await apiFetch(
        appendCinemaId(`/month-plans/days/${selectedDayDateKey}`, activeCinemaId),
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

      const updatedDay = normalizeMonthPlanDay(
        (await response.json()) as MonthPlanDay,
      );

      setMonthPlan((current) => {
        if (!current) return current;

        return {
          ...current,
          days: current.days.map((day) =>
            getMonthPlanDayDateKey(day) === updatedDay.dateKey ? updatedDay : day,
          ),
        };
      });
      setSelectedDay(updatedDay);
      setDayForm(toDayForm(updatedDay));
      infoDialog.show({
        title: "Planlægningsdag gemt",
        description: `Datoen ${formatDateKey(updatedDay.dateKey)} er gemt. Gem en forhåndsvisning, når månedens datoer er klar.`,
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
      <main className="min-h-screen space-y-6 bg-gray-50 p-4 text-gray-950 dark:bg-gray-950 dark:text-gray-100 sm:p-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Vagtplanlægning
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
            Månedsplan
          </h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Vælg vagtsskabeloner på dage eller hele uger. Gennemgå
            forhåndsvisningen, før vagterne oprettes i vagtplanen.
          </p>
        </section>

        {needsMasterCinemaSelection && <ShiftPlanningMasterCinemaRequired />}

        {!needsMasterCinemaSelection && (
          <>
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <div className="hidden lg:block" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Måned
                  </p>
                  <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
                    {getMonthName(year, month)}
                  </h2>
                  <p className="mx-auto mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                    Klik på en dato for at vælge skabelon, markere lukket dag
                    eller tilføje en intern note.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
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
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Aktive dage
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
                  {monthSummary.activeDays}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Med skabelon
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
                  {monthSummary.daysWithTemplate}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Mangler planlægning
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
                  {monthSummary.missingTemplateDays}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Inaktive dage
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
                  {monthSummary.inactiveDays}
                </p>
              </div>
            </section>

            <ShiftPlanningMissingTemplateOverview
              days={missingTemplateDays}
              loading={loading}
              onOpenDay={openDayModal}
            />

            <ShiftPlanningDraftPreview
              activeCinemaId={activeCinemaId}
              days={plannedTemplateDays}
              loading={loading}
              month={month}
              templatesById={templatesById}
              year={year}
              onOpenDay={openDayModal}
              onDraftPrepared={() =>
                setDraftRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
              }
            />

            <ShiftPlanningSavedDraftsOverview
              activeCinemaId={activeCinemaId}
              month={month}
              refreshKey={draftRefreshKey}
              year={year}
              onDraftPublished={refreshMonthPlanAfterDraftPublish}
            />

            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 hidden grid-cols-[minmax(7rem,8rem)_repeat(7,minmax(0,1fr))] gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:grid">
                <div className="text-left">Uge</div>
                {weekdayHeaders.map((weekday) => (
                  <div key={weekday}>{weekday}</div>
                ))}
              </div>

              {loading && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Henter månedens planlægningsgrundlag...
                </div>
              )}

              {!loading && days.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Ingen planlægningsdage fundet for måneden.
                </div>
              )}

              {!loading && days.length > 0 && (
                <div className="space-y-2">
                  {calendarWeeks.map((week) => (
                    <div
                      key={week.weekKey}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(7rem,8rem)_repeat(7,minmax(0,1fr))]"
                    >
                      <ShiftPlanningWeekIndicator
                      weekNumber={week.weekNumber}
                      activeDays={week.activeDays}
                      daysWithTemplate={week.daysWithTemplate}
                      missingTemplateDays={week.missingTemplateDays}
                      templates={templates}
                      saving={savingWeekKey === week.weekKey}
                      onApplyTemplate={(scheduleTemplateId) =>
                        applyTemplateToWeek(
                          week.weekKey,
                          week.days,
                          scheduleTemplateId,
                        )
                      }
                    />

                      {week.days.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <div
                              key={`${week.weekKey}-blank-${dayIndex}`}
                              className="hidden min-h-32 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-950/40 lg:block"
                            />
                          );
                        }

                        const template = day.scheduleTemplateId
                          ? templatesById.get(day.scheduleTemplateId) ??
                            day.scheduleTemplate
                          : null;

                        return (
                          <ShiftPlanningDayCard
                            key={getMonthPlanDayDateKey(day) || day.date}
                            day={day}
                            template={template}
                            onOpen={() => openDayModal(day)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {selectedDay && dayForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 text-gray-950 shadow-xl dark:bg-gray-900 dark:text-gray-100">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                  Planlægningsdag
                </p>
                <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
                  {getWeekdayName(getMonthPlanDayDateKey(selectedDay), "long")} {formatDateKey(getMonthPlanDayDateKey(selectedDay))}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Vælg hvilken vagtsskabelon der skal bruges på denne dato.
                  Aktive vagter oprettes først i en senere fase.
                </p>
              </div>

              <form className="space-y-5" onSubmit={submitDay}>
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
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
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                    disabled={saving}
                  />
                  <span>
                    <span className="block font-semibold text-gray-950 dark:text-white">
                      Aktiv planlægningsdag
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Slå fra for lukkedage eller dage uden planlagt bemanding.
                    </span>
                  </span>
                </label>

                <div>
                  <label
                    className="text-sm font-semibold"
                    htmlFor="scheduleTemplateId"
                  >
                    Anvendt skabelon på denne dato
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
                    {templates.map((template) => {
                      const weekParityMatches = isTemplateWeekParityCompatible(
                        template,
                        selectedDayDateKey,
                      );

                      return (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {!weekParityMatches ? " · passer ikke til denne uge" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Datoen ligger i {selectedDayWeekLabel}. Skabeloner, der ikke
                    passer til ugen, kan vælges som bevidst afvigelse, men bør
                    normalt undgås.
                  </p>
                  {templates.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      Der findes ingen aktive vagtsskabeloner endnu. Opret en
                      skabelon på siden Vagtsskabeloner, før du kan lægge den
                      på en dato.
                    </p>
                  )}
                </div>

                <ShiftPlanningTemplatePreview
                  dateKey={selectedDayDateKey}
                  isActive={dayForm.isActive}
                  template={selectedTemplate}
                />

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
