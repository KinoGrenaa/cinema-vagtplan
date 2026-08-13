"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import AdminGuard from "@/app/components/access/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import ShiftPlanningDayCard from "./components/month/ShiftPlanningDayCard";
import ShiftPlanningTemplatePreview from "./components/template-preview/ShiftPlanningTemplatePreview";
import ShiftPlanningWeekIndicator from "./components/month/ShiftPlanningWeekIndicator";
import ShiftPlanningDraftWorkspaceBar, {
  type ShiftPlanningNamedDraftSummary,
} from "./components/draft-workspace/ShiftPlanningDraftWorkspaceBar";
import ShiftPlanningUnsavedChangesDialog, {
  type ShiftPlanningUnsavedActionKind,
} from "./components/draft-workspace/ShiftPlanningUnsavedChangesDialog";
import ShiftPlanningRemoveShiftsDialog, {
  type ShiftPlanningRemovalPreview,
  type ShiftPlanningRemovalScope,
} from "./components/draft-workspace/ShiftPlanningRemoveShiftsDialog";
import ShiftPlanningReplaceShiftsDialog, {
  type ShiftPlanningReplacementPreview,
  type ShiftPlanningReplacementScope,
} from "./components/draft-workspace/ShiftPlanningReplaceShiftsDialog";

type PendingShiftPlanningDraftAction =
  | { type: "select-draft"; draftId: number }
  | { type: "view-schedule" }
  | { type: "create-draft"; name: string }
  | { type: "change-month"; delta: number }
  | { type: "current-month" };
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
  getSelectedMasterCinemaId,
  getWeekdayName,
  isPlanningMissing,
  isTemplateWeekParityCompatible,
  readErrorMessage,
} from "./helpers/shiftPlanningHelpers";
import type {
  CurrentUser,
  MonthPlanDay,
  MonthPlanResponse,
  ScheduleTemplateSummary,
  ShiftMonthOverviewResponse,
  ShiftPlanningWorkingPreviewResponse,
} from "./helpers/shiftPlanningTypes";

type DayFormState = {
  isActive: boolean;
  scheduleTemplateId: string;
  note: string;
};

type SavedDraftPublicationPreviewItem = {
  draftItemId?: number | string | null;
  dateKey?: string | null;
  scheduleTemplateId?: number | string | null;
  jobFunctionId?: number | string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  userId?: number | string | null;
  userName?: string | null;
  requiredIndex?: number | string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  startTime?: string | null;
  endTime?: string | null;
  canBecomeShift?: boolean | null;
  blockReasons?: string[] | null;
  warningCode?: string | null;
  warningMessage?: string | null;
};

type SavedDraftPublicationPreview = {
  draftId?: number | string;
  cinemaId?: number | string | null;
  year?: number | string | null;
  month?: number | string | null;
  checkedAt?: string | null;
  summary?: {
    itemCount?: number | string | null;
    publishableItemCount?: number | string | null;
    blockedItemCount?: number | string | null;
    validationWarningCount?: number | string | null;
  } | null;
  previewItems?: SavedDraftPublicationPreviewItem[];
};

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRequiredNumber(value: unknown) {
  return toOptionalNumber(value) ?? 0;
}

function toSavedDraftWorkingPreview(
  data: SavedDraftPublicationPreview,
): ShiftPlanningWorkingPreviewResponse {
  const items = Array.isArray(data.previewItems) ? data.previewItems : [];
  const existingShiftCount = items.filter((item) =>
    (item.blockReasons ?? []).some((reason) =>
      reason.includes("Allerede i vagtplanen"),
    ),
  ).length;
  const pastItemCount = items.filter((item) =>
    (item.blockReasons ?? []).some((reason) => reason.includes("Overstået dato")),
  ).length;
  const blockedItemCount = toRequiredNumber(data.summary?.blockedItemCount);
  const warningCount = toRequiredNumber(
    data.summary?.validationWarningCount,
  );

  return {
    cinemaId: toRequiredNumber(data.cinemaId),
    year: toRequiredNumber(data.year),
    month: toRequiredNumber(data.month),
    checkedAt: data.checkedAt ?? new Date().toISOString(),
    source: "SAVED_DRAFT_PREVIEW",
    persistsDraft: true,
    summary: {
      itemCount: toRequiredNumber(data.summary?.itemCount),
      readyItemCount: toRequiredNumber(data.summary?.publishableItemCount),
      blockedItemCount,
      existingShiftCount,
      pastItemCount,
      warningCount,
      hasProblems: blockedItemCount > 0 || warningCount > 0,
    },
    warnings: [],
    items: items
      .filter((item) => typeof item.dateKey === "string" && item.dateKey)
      .map((item, index) => ({
        previewItemId: `saved-${String(data.draftId ?? "draft")}-${String(
          item.draftItemId ?? index,
        )}`,
        dateKey: String(item.dateKey),
        monthPlanDayId: null,
        scheduleTemplateId: toOptionalNumber(item.scheduleTemplateId),
        scheduleTemplateDayId: null,
        templateJobFunctionId: null,
        jobFunctionId: toOptionalNumber(item.jobFunctionId),
        jobFunctionName: item.jobFunctionName ?? null,
        jobFunctionColor: item.jobFunctionColor ?? null,
        userId: toOptionalNumber(item.userId),
        userName: item.userName ?? null,
        userEmail: null,
        requiredIndex: toRequiredNumber(item.requiredIndex) || 1,
        plannedStartMinute: toOptionalNumber(item.plannedStartMinute),
        plannedEndMinute: toOptionalNumber(item.plannedEndMinute),
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        canBecomeShift: item.canBecomeShift === true,
        blockReasons: Array.isArray(item.blockReasons)
          ? item.blockReasons
          : [],
        warningCode: item.warningCode ?? null,
        warningMessage: item.warningMessage ?? null,
      })),
  };
}

const weekdayHeaders = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function getInitialMonth() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}
function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  const workingPreviewRequestRef = useRef(0);

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
  const [shiftMonthOverview, setShiftMonthOverview] =
    useState<ShiftMonthOverviewResponse | null>(null);
  const [workingPreview, setWorkingPreview] =
    useState<ShiftPlanningWorkingPreviewResponse | null>(null);
  const [workingPreviewLoading, setWorkingPreviewLoading] = useState(false);
  const [workingPreviewError, setWorkingPreviewError] = useState<string | null>(
    null,
  );
  const [savedDrafts, setSavedDrafts] =
    useState<ShiftPlanningNamedDraftSummary[]>([]);
  const [savedDraftsLoading, setSavedDraftsLoading] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [selectedDraftPreview, setSelectedDraftPreview] =
    useState<ShiftPlanningWorkingPreviewResponse | null>(null);
  const [selectedDraftPreviewLoading, setSelectedDraftPreviewLoading] =
    useState(false);
  const [draftWorkspaceBusy, setDraftWorkspaceBusy] = useState(false);
  const [planningShiftReplacement, setPlanningShiftReplacement] = useState<{
    scope: ShiftPlanningReplacementScope;
    dateKey: string;
    targetLabel: string;
    draftId: number | null;
    preview: ShiftPlanningReplacementPreview | null;
  } | null>(null);
  const [planningShiftReplacementLoading, setPlanningShiftReplacementLoading] =
    useState(false);
  const [planningShiftReplacementBusy, setPlanningShiftReplacementBusy] =
    useState(false);
  const [planningShiftReplacementError, setPlanningShiftReplacementError] =
    useState<string | null>(null);
  const [publishingDraftId, setPublishingDraftId] = useState<number | null>(null);
  const [planningShiftRemoval, setPlanningShiftRemoval] = useState<{
    scope: ShiftPlanningRemovalScope;
    dateKey: string;
    targetLabel: string;
    preview: ShiftPlanningRemovalPreview | null;
  } | null>(null);
  const [planningShiftRemovalLoading, setPlanningShiftRemovalLoading] = useState(false);
  const [planningShiftRemovalBusy, setPlanningShiftRemovalBusy] = useState(false);
  const [planningShiftRemovalError, setPlanningShiftRemovalError] =
    useState<string | null>(null);
  const [draftWorkspaceError, setDraftWorkspaceError] = useState<string | null>(
    null,
  );
  const [draftDirty, setDraftDirty] = useState(false);
  const [dirtyDateKeys, setDirtyDateKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingDraftAction, setPendingDraftAction] =
    useState<PendingShiftPlanningDraftAction | null>(null);
  const [pendingDraftActionBusy, setPendingDraftActionBusy] = useState(false);
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

  const selectedDraft = savedDrafts.find(
    (draft) => Number(draft.id) === selectedDraftId,
  );
  const selectedDraftIsEditable =
    String(selectedDraft?.status ?? "").toUpperCase() === "DRAFT";
  const displayedPreview =
    selectedDraftId === null
      ? null
      : draftDirty
        ? workingPreview
        : selectedDraftPreview;
  const workingPreviewItemsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<MonthPlanDay["workingPreviewItems"]>>();
    (displayedPreview?.items ?? []).forEach((item) => {
      const current = map.get(item.dateKey) ?? [];
      current.push(item);
      map.set(item.dateKey, current);
    });
    return map;
  }, [displayedPreview]);
  const scheduledShiftDaysByDate = useMemo(
    () =>
      new Map(
        (shiftMonthOverview?.days ?? []).map((day) => [day.dateKey, day]),
      ),
    [shiftMonthOverview],
  );
  const days = useMemo(
    () =>
      (monthPlan?.days ?? []).map((day) => {
        const scheduledDay = scheduledShiftDaysByDate.get(
          getMonthPlanDayDateKey(day),
        );
        return {
          ...day,
          scheduledShifts: scheduledDay?.shifts ?? [],
          scheduledShiftCount: scheduledDay?.shiftCount ?? 0,
          scheduledAssignedShiftCount: scheduledDay?.assignedShiftCount ?? 0,
          scheduledUnassignedShiftCount: scheduledDay?.unassignedShiftCount ?? 0,
          workingPreviewItems:
            workingPreviewItemsByDate.get(getMonthPlanDayDateKey(day)) ?? [],
        };
      }),
    [monthPlan, scheduledShiftDaysByDate, workingPreviewItemsByDate],
  );
  const leadingBlankCount = getCalendarLeadingBlankCount(year, month);
  const calendarWeeks = useMemo(
    () => getMonthCalendarWeeks(days, leadingBlankCount),
    [days, leadingBlankCount],
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
    if (!selectedDay) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [selectedDay]);


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

      const [monthResponse, templatesResponse, shiftOverviewResponse] =
        await Promise.all([
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
          apiFetch(
            appendCinemaId(
              `/shifts/month-overview?year=${year}&month=${month}`,
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
      if (!shiftOverviewResponse.ok) {
        throw new Error(
          await readErrorMessage(
            shiftOverviewResponse,
            "Kunne ikke hente de faktiske vagter fra vagtplanen",
          ),
        );
      }

      const [monthData, templatesData, shiftOverviewData] = await Promise.all([
        monthResponse.json(),
        templatesResponse.json(),
        shiftOverviewResponse.json(),
      ]);

      setMonthPlan(normalizeMonthPlanResponse(monthData as MonthPlanResponse));
      setShiftMonthOverview(shiftOverviewData as ShiftMonthOverviewResponse);
      setTemplates(
        Array.isArray(templatesData)
          ? (templatesData as ScheduleTemplateSummary[])
          : [],
      );
    } catch (error) {
      setMonthPlan(null);
      setShiftMonthOverview(null);
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
      setShiftMonthOverview(null);
      setTemplates([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

  useEffect(() => {
    if (
      !currentUser ||
      needsMasterCinemaSelection ||
      !activeCinemaId ||
      !monthPlan
    ) {
      workingPreviewRequestRef.current += 1;
      setWorkingPreview(null);
      setWorkingPreviewError(null);
      setWorkingPreviewLoading(false);
      return;
    }

    const requestId = workingPreviewRequestRef.current + 1;
    workingPreviewRequestRef.current = requestId;
    const timeoutId = window.setTimeout(async () => {
      try {
        setWorkingPreviewLoading(true);
        setWorkingPreviewError(null);
        const response = await apiFetch(
          appendCinemaId("/shift-planning-drafts/preview", activeCinemaId),
          {
            method: "POST",
            body: JSON.stringify({ year, month, cinemaId: activeCinemaId }),
          },
        );
        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke beregne arbejdsforslaget",
            ),
          );
        }
        const result =
          (await response.json()) as ShiftPlanningWorkingPreviewResponse;
        if (workingPreviewRequestRef.current === requestId) {
          setWorkingPreview(result);
        }
      } catch (error) {
        if (workingPreviewRequestRef.current === requestId) {
          setWorkingPreview(null);
          setWorkingPreviewError(
            error instanceof Error
              ? error.message
              : "Arbejdsforslaget kunne ikke beregnes.",
          );
        }
      } finally {
        if (workingPreviewRequestRef.current === requestId) {
          setWorkingPreviewLoading(false);
        }
      }
    }, 75);

    return () => {
      window.clearTimeout(timeoutId);
      if (workingPreviewRequestRef.current === requestId) {
        workingPreviewRequestRef.current += 1;
      }
    };
  }, [
    activeCinemaId,
    currentUser,
    month,
    monthPlan,
    needsMasterCinemaSelection,
    year,
  ]);
  const fetchSavedDrafts = useCallback(async () => {
    if (!activeCinemaId) {
      setSavedDrafts([]);
      return;
    }

    try {
      setSavedDraftsLoading(true);
      setDraftWorkspaceError(null);
      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts?year=${year}&month=${month}`,
          activeCinemaId,
        ),
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente kladder"),
        );
      }
      const data = (await response.json()) as {
        drafts?: ShiftPlanningNamedDraftSummary[];
      };
      const drafts = Array.isArray(data.drafts) ? data.drafts : [];
      setSavedDrafts(drafts);
    } catch (error) {
      setSavedDrafts([]);
      setDraftWorkspaceError(
        error instanceof Error
          ? error.message
          : "Kladderne kunne ikke hentes.",
      );
    } finally {
      setSavedDraftsLoading(false);
    }
  }, [activeCinemaId, month, year]);

  useEffect(() => {
    void fetchSavedDrafts();
  }, [draftRefreshKey, fetchSavedDrafts]);

  useEffect(() => {
    if (!selectedDraftId || !activeCinemaId) {
      setSelectedDraftPreview(null);
      setSelectedDraftPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const loadSelectedDraft = async () => {
      try {
        setSelectedDraftPreviewLoading(true);
        setDraftWorkspaceError(null);
        const response = await apiFetch(
          appendCinemaId(
            `/shift-planning-drafts/${selectedDraftId}/publication-preview`,
            activeCinemaId,
          ),
        );
        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Kunne ikke åbne kladden"),
          );
        }
        const data = (await response.json()) as SavedDraftPublicationPreview;
        if (!cancelled) {
          setSelectedDraftPreview(toSavedDraftWorkingPreview(data));
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedDraftPreview(null);
          setDraftWorkspaceError(
            error instanceof Error
              ? error.message
              : "Kladden kunne ikke åbnes.",
          );
        }
      } finally {
        if (!cancelled) setSelectedDraftPreviewLoading(false);
      }
    };

    void loadSelectedDraft();
    return () => {
      cancelled = true;
    };
  }, [activeCinemaId, draftRefreshKey, selectedDraftId]);

  const openDraftWorkspace = useCallback(
    async (draftId: number) => {
      if (!activeCinemaId) {
        throw new Error("Vælg en biograf, før kladden åbnes.");
      }

      setDraftWorkspaceBusy(true);
      setDraftWorkspaceError(null);
      try {
        const response = await apiFetch(
          appendCinemaId(
            `/shift-planning-drafts/${draftId}/open`,
            activeCinemaId,
          ),
          {
            method: "POST",
            body: JSON.stringify({ cinemaId: activeCinemaId }),
          },
        );
        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Kunne ikke åbne kladden"),
          );
        }
        await fetchData();
        setSelectedDraftId(draftId);
        setSelectedDraftPreview(null);
        setDraftDirty(false);
        setDirtyDateKeys(new Set());
      } finally {
        setDraftWorkspaceBusy(false);
      }
    },
    [activeCinemaId, fetchData],
  );

  const selectDraftView = useCallback(
    async (draftId: number | null) => {
      if (draftId === selectedDraftId) return;
      if (draftDirty) {
        setDraftWorkspaceError(null);
        setPendingDraftAction(
          draftId === null
            ? { type: "view-schedule" }
            : { type: "select-draft", draftId },
        );
        return;
      }

      if (draftId === null) {
        setSelectedDraftId(null);
        setSelectedDraftPreview(null);
        setWorkingPreview(null);
        setDraftDirty(false);
        setDirtyDateKeys(new Set());
        setDraftWorkspaceError(null);
        return;
      }

      await openDraftWorkspace(draftId);
    },
    [draftDirty, openDraftWorkspace, selectedDraftId],
  );


  const createNamedDraftNow = async (name: string) => {
    if (!activeCinemaId) {
      throw new Error("Vælg en biograf, før kladden oprettes.");
    }

    try {
      setDraftWorkspaceBusy(true);
      setDraftWorkspaceError(null);
      const response = await apiFetch(
        appendCinemaId("/shift-planning-drafts/create", activeCinemaId),
        {
          method: "POST",
          body: JSON.stringify({
            year,
            month,
            cinemaId: activeCinemaId,
            name,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette kladden"),
        );
      }
      const createdDraft = (await response.json()) as { id?: number | string };
      const createdDraftId = Number(createdDraft.id);
      if (!Number.isInteger(createdDraftId) || createdDraftId <= 0) {
        throw new Error("Den nye kladde fik ikke et gyldigt ID.");
      }
      setDraftRefreshKey((current) => current + 1);
      await openDraftWorkspace(createdDraftId);
      infoDialogRef.current.show({
        title: "Kladde oprettet",
        description: "Kladden “" + name + "” er oprettet og valgt i kalenderen.",
        variant: "success",
        buttonText: "OK",
      });
    } finally {
      setDraftWorkspaceBusy(false);
    }
  };

  const createNamedDraft = async (name: string) => {
    if (draftDirty) {
      setDraftWorkspaceError(null);
      setPendingDraftAction({ type: "create-draft", name });
      return;
    }
    await createNamedDraftNow(name);
  };

  const saveSelectedDraftChanges = async (options: { showConfirmation?: boolean } = {}) => {
    if (!selectedDraftId || !activeCinemaId || !selectedDraftIsEditable) {
      throw new Error("Vælg en åben kladde, før ændringerne gemmes.");
    }

    try {
      setDraftWorkspaceBusy(true);
      setDraftWorkspaceError(null);
      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${selectedDraftId}/save-changes`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({ cinemaId: activeCinemaId }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke gemme ændringerne"),
        );
      }
      const savedDraft = (await response.json()) as {
        itemCount?: number | string | null;
      };
      if (workingPreview) {
        setSelectedDraftPreview(workingPreview);
      }
      setSavedDrafts((current) =>
        current.map((draft) =>
          Number(draft.id) === selectedDraftId
            ? { ...draft, itemCount: savedDraft.itemCount ?? draft.itemCount }
            : draft,
        ),
      );
      setDirtyDateKeys(new Set());
      setDraftDirty(false);
      if (options.showConfirmation !== false) {
        infoDialogRef.current.show({
          title: "Ændringer gemt",
          description: "Kladden er opdateret. Eksisterende vagter er ikke ændret.",
          variant: "success",
          buttonText: "OK",
        });
      }
    } finally {
      setDraftWorkspaceBusy(false);
    }
  };

  const discardSelectedDraftChanges = async () => {
    if (!selectedDraftId) {
      throw new Error("Vælg en kladde, før ændringerne fortrydes.");
    }
    await openDraftWorkspace(selectedDraftId);
    infoDialogRef.current.show({
      title: "Ændringer fortrudt",
      description: "Kladdens senest gemte version vises igen.",
      variant: "success",
      buttonText: "OK",
    });
  };

  const copySelectedDraft = async (name: string) => {
    if (!selectedDraftId || !activeCinemaId) {
      throw new Error("Vælg en kladde, før den kopieres.");
    }
    if (draftDirty) {
      throw new Error("Gem eller fortryd ændringerne, før kladden kopieres.");
    }

    try {
      setDraftWorkspaceBusy(true);
      setDraftWorkspaceError(null);
      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${selectedDraftId}/copy`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({
            cinemaId: activeCinemaId,
            name,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke kopiere kladden"),
        );
      }
      const copiedDraft = (await response.json()) as { id?: number | string };
      const copiedDraftId = Number(copiedDraft.id);
      setDraftRefreshKey((current) => current + 1);
      if (Number.isInteger(copiedDraftId) && copiedDraftId > 0) {
        await openDraftWorkspace(copiedDraftId);
      }
      infoDialogRef.current.show({
        title: "Kladde kopieret",
        description: `Kopien “${name}” er gemt og valgt i kalenderen. Originalen er ikke ændret.`,
        variant: "success",
        buttonText: "OK",
      });
    } finally {
      setDraftWorkspaceBusy(false);
    }
  };


  const deleteSelectedDraft = async () => {
    if (!selectedDraftId || !activeCinemaId) {
      throw new Error("Vælg en kladde, før den slettes.");
    }
    if (draftDirty) {
      throw new Error("Gem eller fortryd ændringerne, før kladden slettes.");
    }

    try {
      setDraftWorkspaceBusy(true);
      setDraftWorkspaceError(null);
      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${selectedDraftId}`,
          activeCinemaId,
        ),
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke slette kladden"),
        );
      }
      setSelectedDraftId(null);
      setSelectedDraftPreview(null);
      setDraftDirty(false);
      setDirtyDateKeys(new Set());
      setDraftRefreshKey((current) => current + 1);
      infoDialogRef.current.show({
        title: "Kladde slettet",
        description: "Kladden er slettet. Eksisterende vagter er ikke ændret.",
        variant: "success",
        buttonText: "OK",
      });
    } finally {
      setDraftWorkspaceBusy(false);
    }
  };

  const loadPlanningShiftReplacementPreview = async (
    scope: ShiftPlanningReplacementScope,
    dateKey: string,
    draftId: number,
  ) => {
    if (!activeCinemaId || !dateKey) return;

    setPlanningShiftReplacementLoading(true);
    setPlanningShiftReplacementError(null);

    try {
      const response = await apiFetch(
        appendCinemaId(
          `/shifts/planning-replacement-preview?draftId=${draftId}&scope=${scope}&date=${encodeURIComponent(dateKey)}`,
          activeCinemaId,
        ),
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke kontrollere erstatningen",
          ),
        );
      }

      const preview = (await response.json()) as ShiftPlanningReplacementPreview;
      setPlanningShiftReplacement((current) =>
        current &&
        current.scope === scope &&
        current.dateKey === dateKey &&
        current.draftId === draftId
          ? { ...current, preview }
          : current,
      );
    } catch (error) {
      setPlanningShiftReplacementError(
        error instanceof Error
          ? error.message
          : "Erstatningen kunne ikke kontrolleres.",
      );
    } finally {
      setPlanningShiftReplacementLoading(false);
    }
  };

  const openPlanningShiftReplacement = async (
    scope: ShiftPlanningReplacementScope,
    dateKey: string,
    targetLabel: string,
  ) => {
    if (!activeCinemaId || !dateKey) {
      infoDialogRef.current.showError(
        "Kan ikke kontrollere erstatningen",
        "Den valgte periode kunne ikke bestemmes.",
      );
      return;
    }
    if (draftDirty) {
      infoDialogRef.current.showError(
        "Gem ændringerne først",
        "Der er ikke gemte ændringer i den viste kladde. Gem eller fortryd dem, før du erstatter vagter.",
      );
      return;
    }

    const openDraftIds = savedDrafts
      .filter(
        (draft) => String(draft.status ?? "").toUpperCase() === "DRAFT",
      )
      .map((draft) => Number(draft.id))
      .filter((draftId) => Number.isInteger(draftId) && draftId > 0);

    if (openDraftIds.length === 0) {
      infoDialogRef.current.showError(
        "Ingen åben kladde",
        "Opret eller åbn en gemt kladde, som vagterne kan erstattes med.",
      );
      return;
    }

    const initialDraftId =
      selectedDraftId !== null && openDraftIds.includes(selectedDraftId)
        ? selectedDraftId
        : null;

    setPlanningShiftReplacement({
      scope,
      dateKey,
      targetLabel,
      draftId: initialDraftId,
      preview: null,
    });

    if (initialDraftId !== null) {
      await loadPlanningShiftReplacementPreview(
        scope,
        dateKey,
        initialDraftId,
      );
    }
  };

  const selectPlanningShiftReplacementDraft = async (draftId: number) => {
    const replacement = planningShiftReplacement;
    if (
      !replacement ||
      replacement.draftId === draftId ||
      !Number.isInteger(draftId) ||
      draftId <= 0
    ) {
      return;
    }

    setPlanningShiftReplacement({
      ...replacement,
      draftId,
      preview: null,
    });

    await loadPlanningShiftReplacementPreview(
      replacement.scope,
      replacement.dateKey,
      draftId,
    );
  };

  const confirmPlanningShiftReplacement = async () => {
    const replacement = planningShiftReplacement;
    if (
      !replacement ||
      replacement.draftId === null ||
      !replacement.preview?.summary.canReplace ||
      !activeCinemaId
    ) {
      return;
    }

    try {
      setPlanningShiftReplacementBusy(true);
      setPlanningShiftReplacementError(null);
      const response = await apiFetch(
        appendCinemaId("/shifts/planning-replacement", activeCinemaId),
        {
          method: "POST",
          body: JSON.stringify({
            cinemaId: activeCinemaId,
            draftId: replacement.draftId,
            scope: replacement.scope,
            date: replacement.dateKey,
            confirmationText: "ERSTAT VAGTER",
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke erstatte vagterne"),
        );
      }

      const result = (await response.json()) as {
        removedShiftCount?: number | string | null;
        createdShiftCount?: number | string | null;
        assignedUserCount?: number | string | null;
      };
      const removedShiftCount = Number(result.removedShiftCount ?? 0);
      const createdShiftCount = Number(result.createdShiftCount ?? 0);
      const assignedUserCount = Number(result.assignedUserCount ?? 0);

      setPlanningShiftReplacement(null);
      setPlanningShiftReplacementError(null);
      await fetchData();

      window.setTimeout(() => {
        infoDialogRef.current.show({
          title: "Vagter erstattet",
          description:
            `${removedShiftCount} ${
              removedShiftCount === 1 ? "vagt er" : "vagter er"
            } fjernet og ${createdShiftCount} ${
              createdShiftCount === 1 ? "vagt er" : "vagter er"
            } oprettet.` +
            (assignedUserCount > 0
              ? ` ${assignedUserCount} ${
                  assignedUserCount === 1
                    ? "berørt medarbejder får"
                    : "berørte medarbejdere får"
                } besked.`
              : ""),
          variant: "success",
          buttonText: "OK",
        });
      }, 0);
    } catch (error) {
      setPlanningShiftReplacementError(
        error instanceof Error
          ? error.message
          : "Vagterne kunne ikke erstattes.",
      );
    } finally {
      setPlanningShiftReplacementBusy(false);
    }
  };


  const openPlanningShiftRemoval = async (
    scope: ShiftPlanningRemovalScope,
    dateKey: string,
    targetLabel: string,
  ) => {
    if (!activeCinemaId || !dateKey) {
      infoDialogRef.current.showError(
        "Kan ikke kontrollere vagterne",
        "Biograf eller dato mangler.",
      );
      return;
    }

    setPlanningShiftRemoval({
      scope,
      dateKey,
      targetLabel,
      preview: null,
    });
    setPlanningShiftRemovalLoading(true);
    setPlanningShiftRemovalError(null);

    try {
      const response = await apiFetch(
        appendCinemaId(
          `/shifts/planning-removal-preview?scope=${scope}&date=${encodeURIComponent(dateKey)}`,
          activeCinemaId,
        ),
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke kontrollere hvilke vagter der kan fjernes",
          ),
        );
      }

      const preview = (await response.json()) as ShiftPlanningRemovalPreview;
      setPlanningShiftRemoval((current) =>
        current && current.scope === scope && current.dateKey === dateKey
          ? { ...current, preview }
          : current,
      );
    } catch (error) {
      setPlanningShiftRemovalError(
        error instanceof Error
          ? error.message
          : "Vagterne kunne ikke kontrolleres.",
      );
    } finally {
      setPlanningShiftRemovalLoading(false);
    }
  };

  const confirmPlanningShiftRemoval = async () => {
    const removal = planningShiftRemoval;
    if (
      !removal ||
      !removal.preview?.summary.canRemove ||
      !activeCinemaId
    ) {
      return;
    }

    try {
      setPlanningShiftRemovalBusy(true);
      setPlanningShiftRemovalError(null);
      const response = await apiFetch(
        appendCinemaId("/shifts/planning-removal", activeCinemaId),
        {
          method: "POST",
          body: JSON.stringify({
            cinemaId: activeCinemaId,
            scope: removal.scope,
            date: removal.dateKey,
            confirmationText: "FJERN VAGTER",
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne vagterne"),
        );
      }

      const result = (await response.json()) as {
        removedShiftCount?: number | string | null;
        assignedUserCount?: number | string | null;
      };
      const removedShiftCount = Number(result.removedShiftCount ?? 0);
      const assignedUserCount = Number(result.assignedUserCount ?? 0);

      setPlanningShiftRemoval(null);
      setPlanningShiftRemovalError(null);
      await fetchData();

      const assignedUserMessage =
        assignedUserCount === 1
          ? " 1 berørt medarbejder får besked."
          : assignedUserCount > 1
            ? ` ${assignedUserCount} berørte medarbejdere får besked.`
            : "";

      window.setTimeout(() => {
        infoDialogRef.current.show({
          title: "Vagter fjernet",
          description:
            `${removedShiftCount} ${removedShiftCount === 1 ? "vagt er" : "vagter er"} fjernet fra vagtplanen.` +
            assignedUserMessage,
          variant: "success",
          buttonText: "OK",
        });
      }, 0);
    } catch (error) {
      setPlanningShiftRemovalError(
        error instanceof Error ? error.message : "Vagterne kunne ikke fjernes.",
      );
    } finally {
      setPlanningShiftRemovalBusy(false);
    }
  };

  const publishSelectedDraft = async () => {
    if (!selectedDraftId || !activeCinemaId || !selectedDraftIsEditable) {
      throw new Error("Vælg en åben kladde, før vagterne oprettes.");
    }
    if (draftDirty) {
      throw new Error("Gem ændringerne, før vagterne oprettes.");
    }

    const preview = displayedPreview;
    const readyCount = Number(preview?.summary.readyItemCount ?? 0);
    const blockedCount = Number(preview?.summary.blockedItemCount ?? 0);
    if (!preview || !Number.isFinite(readyCount) || readyCount <= 0) {
      throw new Error("Der er ingen vagter klar til oprettelse.");
    }
    if (!Number.isFinite(blockedCount) || blockedCount > 0) {
      throw new Error("Ret de markerede blokeringer i kalenderen først.");
    }

    const publishedDraftId = selectedDraftId;
    try {
      setPublishingDraftId(publishedDraftId);
      setDraftWorkspaceBusy(true);
      setDraftWorkspaceError(null);
      const response = await apiFetch(
        appendCinemaId(
          `/shift-planning-drafts/${publishedDraftId}/publish`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({
            cinemaId: activeCinemaId,
            confirmationText: "OPRET VAGTER",
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette vagterne"),
        );
      }
      const result = (await response.json()) as {
        createdShiftCount?: number | string | null;
        message?: string | null;
      };
      const createdShiftCount = Number(result.createdShiftCount ?? 0);
      setSavedDrafts((current) =>
        current.map((draft) =>
          Number(draft.id) === publishedDraftId
            ? { ...draft, status: "PUBLISHED" }
            : draft,
        ),
      );
      setSelectedDraftId(null);
      setSelectedDraftPreview(null);
      setWorkingPreview(null);
      setDraftDirty(false);
      setDirtyDateKeys(new Set());
      setDraftRefreshKey((current) => current + 1);
      await fetchData();

      window.setTimeout(() => {
        infoDialogRef.current.show({
          title: "Vagter oprettet",
          description:
            result.message ??
            `${createdShiftCount} vagter er oprettet i vagtplanen.`,
          variant: "success",
          buttonText: "OK",
        });
      }, 0);

    } finally {
      setPublishingDraftId(null);
      setDraftWorkspaceBusy(false);
    }
  };


  const changeMonthNow = (delta: number) => {
    const nextMonth = addMonths(year, month, delta);
    setYear(nextMonth.year);
    setMonth(nextMonth.month);
    setSelectedDay(null);
    setDayForm(null);
    setSelectedDraftId(null);
    setSelectedDraftPreview(null);
    setDraftDirty(false);
    setDirtyDateKeys(new Set());
  };
  const changeMonth = (delta: number) => {
    if (draftDirty) {
      setDraftWorkspaceError(null);
      setPendingDraftAction({ type: "change-month", delta });
      return;
    }
    changeMonthNow(delta);
  };

  const goToCurrentMonthNow = () => {
    const nextMonth = getInitialMonth();
    setYear(nextMonth.year);
    setMonth(nextMonth.month);
    setSelectedDay(null);
    setDayForm(null);
    setSelectedDraftId(null);
    setSelectedDraftPreview(null);
    setDraftDirty(false);
    setDirtyDateKeys(new Set());
  };
  const goToCurrentMonth = () => {
    if (draftDirty) {
      setDraftWorkspaceError(null);
      setPendingDraftAction({ type: "current-month" });
      return;
    }
    goToCurrentMonthNow();
  };

  const runPendingDraftAction = async (
    action: PendingShiftPlanningDraftAction,
  ) => {
    switch (action.type) {
      case "select-draft":
        await openDraftWorkspace(action.draftId);
        return;
      case "view-schedule":
        setSelectedDraftId(null);
        setSelectedDraftPreview(null);
        setWorkingPreview(null);
        setDraftDirty(false);
        setDirtyDateKeys(new Set());
        setDraftWorkspaceError(null);
        return;
      case "create-draft":
        await createNamedDraftNow(action.name);
        return;
      case "change-month":
        changeMonthNow(action.delta);
        return;
      case "current-month":
        goToCurrentMonthNow();
        return;
    }
  };

  const saveAndContinuePendingDraftAction = async () => {
    if (!pendingDraftAction) return;
    const action = pendingDraftAction;
    try {
      setPendingDraftActionBusy(true);
      setDraftWorkspaceError(null);
      await saveSelectedDraftChanges({ showConfirmation: false });
      await runPendingDraftAction(action);
      setPendingDraftAction(null);
    } catch (error) {
      setDraftWorkspaceError(
        error instanceof Error
          ? error.message
          : "Handlingen kunne ikke gennemføres.",
      );
    } finally {
      setPendingDraftActionBusy(false);
    }
  };

  const discardAndContinuePendingDraftAction = async () => {
    if (!pendingDraftAction) return;
    const action = pendingDraftAction;
    try {
      setPendingDraftActionBusy(true);
      setDraftWorkspaceError(null);
      if (
        selectedDraftId &&
        (action.type === "change-month" || action.type === "current-month")
      ) {
        await openDraftWorkspace(selectedDraftId);
      }
      await runPendingDraftAction(action);
      setPendingDraftAction(null);
    } catch (error) {
      setDraftWorkspaceError(
        error instanceof Error
          ? error.message
          : "Handlingen kunne ikke gennemføres.",
      );
    } finally {
      setPendingDraftActionBusy(false);
    }
  };

  const openDayModal = (day: MonthPlanDay) => {
    setSelectedDay(day);
    setDayForm(
      selectedDraftId === null
        ? { isActive: day.isActive, scheduleTemplateId: "", note: "" }
        : toDayForm(day),
    );
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
    if (!selectedDraftIsEditable || !selectedDraftId) {
      infoDialog.showError(
        "Vælg en åben kladde",
        "Opret eller vælg en åben kladde, før kalenderen ændres.",
      );
      return;
    }
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

      setDraftDirty(true);
      setDirtyDateKeys((current) => {
        const next = new Set(current);
        updatedDays.forEach((day) => {
          const dateKey = getMonthPlanDayDateKey(day);
          if (dateKey) next.add(dateKey);
        });
        return next;
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

  const resetTemplateForWeek = async (
    weekKey: string,
    weekDays: Array<MonthPlanDay | null>,
  ) => {
    if (!selectedDraftIsEditable || !selectedDraftId) {
      infoDialog.showError(
        "Vælg en åben kladde",
        "Opret eller vælg en åben kladde, før kalenderen ændres.",
      );
      return;
    }
    const todayDateKey = getTodayDateKey();
    const resettableDays = weekDays.filter((day): day is MonthPlanDay => {
      if (!day?.isActive || !day.scheduleTemplateId) return false;
      const dateKey = getMonthPlanDayDateKey(day);
      return Boolean(dateKey) && dateKey >= todayDateKey;
    });

    if (resettableDays.length === 0) {
      infoDialog.showError(
        "Ugen kan ikke nulstilles",
        "Ugen har ingen fremtidige aktive dage med en skabelon.",
      );
      return;
    }

    try {
      setSavingWeekKey(weekKey);
      const updatedDays = await Promise.all(
        resettableDays.map(async (day) => {
          const dateKey = getMonthPlanDayDateKey(day);
          const response = await apiFetch(
            appendCinemaId(`/month-plans/days/${dateKey}`, activeCinemaId),
            {
              method: "PATCH",
              body: JSON.stringify(
                parseDayForm(
                  {
                    ...toDayForm(day),
                    isActive: true,
                    scheduleTemplateId: "",
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
                `Kunne ikke nulstille ${formatDateKey(dateKey)}`,
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
            (day) =>
              updatedDaysByDateKey.get(getMonthPlanDayDateKey(day)) ?? day,
          ),
        };
      });
      setDraftDirty(true);
      setDirtyDateKeys((current) => {
        const next = new Set(current);
        updatedDays.forEach((day) => {
          const dateKey = getMonthPlanDayDateKey(day);
          if (dateKey) next.add(dateKey);
        });
        return next;
      });
      infoDialog.show({
        title: "Uge nulstillet",
        description: `Skabelonen er fjernet fra ${updatedDays.length} fremtidige dage. Eksisterende vagter er ikke ændret.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke nulstille ugen",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da ugen skulle nulstilles.",
      );
    } finally {
      setSavingWeekKey(null);
    }
  };
  const submitDay = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDraftIsEditable || !selectedDraftId) {
      infoDialog.showError(
        "Vælg en åben kladde",
        "Opret eller vælg en åben kladde, før kalenderen ændres.",
      );
      return;
    }

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
      setDraftDirty(true);
      const dirtyDateKey = getMonthPlanDayDateKey(updatedDay);
      if (dirtyDateKey) {
        setDirtyDateKeys((current) => new Set(current).add(dirtyDateKey));
      }
      infoDialog.show({
        title: "Planlægningsdag gemt",
        description: `Datoen ${formatDateKey(updatedDay.dateKey)} er gemt. Arbejdsforslaget i kalenderen opdateres automatisk.`,
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
            Planlæg vagter
          </h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Læg skabeloner på kalenderen. Forslag, faktiske vagter og
            problemer vises automatisk på de relevante datoer.
          </p>
        </section>

        {needsMasterCinemaSelection && <ShiftPlanningMasterCinemaRequired />}

        {!needsMasterCinemaSelection && (
          <>
            <section id="shift-planning-month" className="scroll-mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                    {selectedDraftId === null
                      ? "Du ser den faktiske vagtplan i skrivebeskyttet visning. Vælg eller opret en kladde for at ændre uger og dage."
                      : "Klik på en dato for at vælge skabelon, markere lukket dag eller tilføje en intern note."}
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
                  {selectedDraftIsEditable && (
                    <button
                      type="button"
                      onClick={() =>
                        void openPlanningShiftReplacement(
                          "MONTH",
                          `${year}-${String(month).padStart(2, "0")}-01`,
                          getMonthName(year, month),
                        )
                      }
                      disabled={
                        draftDirty ||
                        planningShiftReplacementLoading ||
                        planningShiftReplacementBusy
                      }
                      title={draftDirty ? "Gem eller fortryd ændringerne i kladden først." : "Vis præcis hvilke månedens planlægningsvagter der fjernes, og hvilke kladdevagter der oprettes."}
                      className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:border-violet-500 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:border-violet-600 dark:hover:bg-violet-950/60"
                    >
                      Erstat månedens vagter
                    </button>
                  )}
                  {selectedDraftIsEditable && (
                  <button
                    type="button"
                    onClick={() =>
                      void openPlanningShiftRemoval(
                        "MONTH",
                        `${year}-${String(month).padStart(2, "0")}-01`,
                        getMonthName(year, month),
                      )
                    }
                    disabled={
                      (shiftMonthOverview?.totalShiftCount ?? 0) === 0 ||
                      planningShiftRemovalLoading ||
                      planningShiftRemovalBusy
                    }
                    title="Forhåndsviser fjernelse af månedens faktiske vagter fra vagtplanlægningen. Manuelle vagter røres ikke."
                    className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-500 hover:bg-red-50 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-950/40"
                  >
                    Fjern månedens vagter
                  </button>
                  )}
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
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Vagter i vagtplanen
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-950 dark:text-blue-100">
                  {shiftMonthOverview?.totalShiftCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm dark:border-violet-900/70 dark:bg-violet-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Vagter i arbejdsforslaget
                </p>
                <p className="mt-2 text-3xl font-bold text-violet-950 dark:text-violet-100">
                  {displayedPreview?.summary.itemCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Klar til oprettelse
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-950 dark:text-emerald-100">
                  {displayedPreview?.summary.readyItemCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Problemer
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-950 dark:text-amber-100">
                  {(displayedPreview?.summary.blockedItemCount ?? 0) +
                    (displayedPreview?.summary.warningCount ?? 0)}
                </p>
              </div>
            </section>

            <ShiftPlanningDraftWorkspaceBar
              drafts={savedDrafts}
              selectedDraftId={selectedDraftId}
              preview={displayedPreview}
              draftsLoading={savedDraftsLoading}
              previewLoading={
                selectedDraftId === null
                  ? false
                  : draftDirty
                    ? workingPreviewLoading
                    : selectedDraftPreviewLoading
              }
              busy={draftWorkspaceBusy || publishingDraftId !== null}
              dirty={draftDirty}
              editable={selectedDraftIsEditable}
              errorMessage={
                draftWorkspaceError ?? (draftDirty ? workingPreviewError : null)
              }
              year={year}
              month={month}
              onSelectDraft={selectDraftView}
              onCreateDraft={createNamedDraft}
              onSaveChanges={saveSelectedDraftChanges}
              onDiscardChanges={discardSelectedDraftChanges}
              onCopyDraft={copySelectedDraft}
              onDeleteDraft={deleteSelectedDraft}
              creatingShifts={publishingDraftId === selectedDraftId}
              onCreateShifts={publishSelectedDraft}
            />


            <section id="shift-planning-calendar" className="scroll-mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 hidden grid-cols-[minmax(7rem,8rem)_repeat(7,minmax(0,1fr))] gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:grid">
                <div className="text-left">Uge</div>
                {weekdayHeaders.map((weekday) => (
                  <div key={weekday}>{weekday}</div>
                ))}
              </div>

              {loading && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Henter planlægningsgrundlag og faktiske vagter...
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
                       editable={selectedDraftIsEditable}
                       showPlanningLayer={selectedDraftId !== null}
                       scheduledShiftCount={week.days.reduce(
                         (total, day) => total + (day?.scheduledShiftCount ?? 0),
                         0,
                       )}
                       canReplacePlannedShifts={
                         !draftDirty &&
                         savedDrafts.some(
                           (draft) =>
                             String(draft.status ?? "").toUpperCase() ===
                             "DRAFT",
                         )
                       }
                       onReplacePlannedShifts={() => {
                         const referenceDay = week.days.find(
                           (day): day is MonthPlanDay => Boolean(day),
                         );
                         const dateKey = referenceDay
                           ? getMonthPlanDayDateKey(referenceDay)
                           : "";
                         if (!dateKey) return;
                         void openPlanningShiftReplacement(
                           "WEEK",
                           dateKey,
                           `uge ${week.weekNumber ?? "?"}`,
                         );
                       }}
                       onRemovePlannedShifts={() => {
                         const referenceDay = week.days.find(
                           (day): day is MonthPlanDay => Boolean(day),
                         );
                         const dateKey = referenceDay
                           ? getMonthPlanDayDateKey(referenceDay)
                           : "";
                         if (!dateKey) return;
                         void openPlanningShiftRemoval(
                           "WEEK",
                           dateKey,
                           `uge ${week.weekNumber ?? "?"}`,
                         );
                       }}
                       canReset={selectedDraftIsEditable && week.days.some((day) => {
                         if (!day?.isActive || !day.scheduleTemplateId) return false;
                         const dateKey = getMonthPlanDayDateKey(day);
                         return Boolean(dateKey) && dateKey >= getTodayDateKey();
                       })}
                       onResetWeek={() =>
                         resetTemplateForWeek(week.weekKey, week.days)
                       }
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
                             showPlanningLayer={selectedDraftId !== null}
                             hasUnsavedChanges={dirtyDateKeys.has(
                               getMonthPlanDayDateKey(day),
                             )}
                             updatingWorkingPreview={
                               workingPreviewLoading &&
                               dirtyDateKeys.has(getMonthPlanDayDateKey(day))
                             }
                            onOpen={() => openDayModal(day)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </section>



    <ShiftPlanningUnsavedChangesDialog
      open={pendingDraftAction !== null}
      actionKind={
        (pendingDraftAction?.type === "current-month"
          ? "change-month"
          : pendingDraftAction?.type ?? "select-draft") as ShiftPlanningUnsavedActionKind
      }
      dirtyDateCount={dirtyDateKeys.size}
      busy={pendingDraftActionBusy || draftWorkspaceBusy}
      errorMessage={draftWorkspaceError}
      onSaveAndContinue={saveAndContinuePendingDraftAction}
      onDiscardAndContinue={discardAndContinuePendingDraftAction}
      onStay={() => {
        if (pendingDraftActionBusy || draftWorkspaceBusy) return;
        setPendingDraftAction(null);
        setDraftWorkspaceError(null);
      }}
    />
    <ShiftPlanningReplaceShiftsDialog
      open={planningShiftReplacement !== null}
      targetLabel={planningShiftReplacement?.targetLabel ?? "den valgte periode"}
      draftOptions={savedDrafts
        .filter(
          (draft) => String(draft.status ?? "").toUpperCase() === "DRAFT",
        )
        .map((draft) => ({
          id: Number(draft.id),
          label:
            typeof draft.note === "string" && draft.note.trim()
              ? draft.note.trim()
              : `Kladde ${draft.id}`,
        }))
        .filter(
          (draft) => Number.isInteger(draft.id) && draft.id > 0,
        )}
      selectedDraftId={planningShiftReplacement?.draftId ?? null}
      preview={planningShiftReplacement?.preview ?? null}
      loading={planningShiftReplacementLoading}
      busy={planningShiftReplacementBusy}
      errorMessage={planningShiftReplacementError}
      onSelectDraft={selectPlanningShiftReplacementDraft}
      onConfirm={confirmPlanningShiftReplacement}
      onClose={() => {
        if (planningShiftReplacementBusy) return;
        setPlanningShiftReplacement(null);
        setPlanningShiftReplacementError(null);
      }}
    />
    <ShiftPlanningRemoveShiftsDialog
      open={planningShiftRemoval !== null}
      targetLabel={planningShiftRemoval?.targetLabel ?? "den valgte periode"}
      preview={planningShiftRemoval?.preview ?? null}
      loading={planningShiftRemovalLoading}
      busy={planningShiftRemovalBusy}
      errorMessage={planningShiftRemovalError}
      onConfirm={confirmPlanningShiftRemoval}
      onClose={() => {
        if (planningShiftRemovalBusy) return;
        setPlanningShiftRemoval(null);
        setPlanningShiftRemovalError(null);
      }}
    />
          </>
        )}

        {selectedDay && dayForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overscroll-contain overflow-y-auto rounded-3xl bg-white p-6 text-gray-950 shadow-xl dark:bg-gray-900 dark:text-gray-100">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                  Planlægningsdag
                </p>
                <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
                  {getWeekdayName(getMonthPlanDayDateKey(selectedDay), "long")} {formatDateKey(getMonthPlanDayDateKey(selectedDay))}
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {selectedDraftId === null
                    ? "Du ser den faktiske vagtplan for denne dato."
                    : "Vælg hvilken vagtsskabelon der skal bruges på denne dato. Aktive vagter oprettes først i en senere fase."}
                </p>
                {!selectedDraftIsEditable && (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-100">
                    <p className="font-bold">
                      Skrivebeskyttet visning
                    </p>
                    <p className="mt-1">
                      Vælg en åben kladde eller opret en ny for at ændre planlægningsdag, skabelon og intern note.
                    </p>
                  </div>
                )}
              {selectedDraftIsEditable &&
                (selectedDay.scheduledShiftCount ?? 0) > 0 && (
                <>
                {!draftDirty &&
                  savedDrafts.some(
                    (draft) =>
                      String(draft.status ?? "").toUpperCase() === "DRAFT",
                  ) && (
                    <button
                      type="button"
                      onClick={() => {
                        const dateKey = getMonthPlanDayDateKey(selectedDay);
                        if (!dateKey) return;
                        closeDayModal();
                        void openPlanningShiftReplacement(
                          "DAY",
                          dateKey,
                          `${getWeekdayName(dateKey, "long")} ${formatDateKey(dateKey)}`,
                        );
                      }}
                      className="mt-4 mr-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:border-violet-500 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:border-violet-600 dark:hover:bg-violet-950/60"
                      title="Vis præcis hvilke af dagens planlægningsvagter der fjernes, og hvilke vagter fra kladden der oprettes."
                    >
                      Erstat dagens vagter
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    const dateKey = getMonthPlanDayDateKey(selectedDay);
                    if (!dateKey) return;
                    closeDayModal();
                    void openPlanningShiftRemoval(
                      "DAY",
                      dateKey,
                      `${getWeekdayName(dateKey, "long")} ${formatDateKey(dateKey)}`,
                    );
                  }}
                  className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-500 hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-950/40"
                  title="Forhåndsviser fjernelse af dagens faktiske vagter fra vagtplanlægningen. Manuelle vagter røres ikke."
                >
                  Fjern dagens vagter
                </button>
                </>
              )}
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
                    disabled={saving || !selectedDraftIsEditable}
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
                    disabled={saving || !selectedDraftIsEditable || !dayForm.isActive}
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
                    disabled={saving || !selectedDraftIsEditable}
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={closeDayModal}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                    disabled={saving}
                  >
                    {selectedDraftIsEditable ? "Annuller" : "Luk"}
                  </button>
                  {selectedDraftIsEditable && (
                    <button
                      type="submit"
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      disabled={saving}
                    >
                      {saving ? "Gemmer..." : "Gem dag"}
                    </button>
                  )}
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
