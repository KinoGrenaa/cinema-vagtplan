"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";

import {
  copyScheduleTemplate,
  summarizeTemplateCopyDays,
  summarizeTemplateStaffing,
} from "./helpers/scheduleTemplateCopy";
import {
  getUniqueCopiedScheduleTemplateName,
  scheduleTemplateNameExists,
} from "./helpers/scheduleTemplateCopyNames";
import {
  countAssignedTemplateUsers,
  getDayStaffingGaps,
  getJobFunctionStaffingGap,
  getTemplateStaffingGaps,
  getTemplateStaffingGapSummary,
  summarizeStaffingGaps,
  summarizeTemplateDayStaffing,
} from "./helpers/scheduleTemplateStaffingGaps";

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

type ScheduleTemplateUser = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: "MASTER" | "ADMIN" | "EMPLOYEE";
  isActive?: boolean;
};

type ScheduleTemplateAssignment = {
  id: number;
  userId?: number | null;
  sortOrder?: number | null;
  user?: ScheduleTemplateUser | null;
};

type TemplateJobFunction = {
  id: number;
  jobFunctionId: number;
  requiredCount: number;
  sortOrder: number;
  note: string | null;
  jobFunction: JobFunction;
  assignments?: ScheduleTemplateAssignment[];
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
  const selectedCinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

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
  return (
    weekdayOptions.find((weekday) => weekday.value === value)?.label ??
    "Ukendt dag"
  );
}

function formatUserName(user: ScheduleTemplateUser | null | undefined) {
  const name = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user?.email || "Ukendt medarbejder";
}

function getAssignmentUserId(assignment: ScheduleTemplateAssignment) {
  const userId = Number(assignment.userId ?? assignment.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

function getTemplateDay(template: ScheduleTemplate | null, weekday: number) {
  return template?.days?.find((day) => day.weekday === weekday) ?? null;
}

function getTemplateJobFunctionCount(template: ScheduleTemplate) {
  return (template.days ?? []).reduce(
    (sum, day) =>
      sum +
      day.jobFunctions.reduce((daySum, item) => daySum + item.requiredCount, 0),
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

  return { name, description, weekParity: form.weekParity, sortOrder };
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
  const requiredCount = form.requiredCount.trim()
    ? Number(form.requiredCount)
    : 1;
  const sortOrder = form.sortOrder.trim() ? Number(form.sortOrder) : 0;

  if (!Number.isInteger(jobFunctionId) || jobFunctionId <= 0) {
    throw new Error("Vælg en jobfunktion.");
  }

  if (
    !Number.isInteger(requiredCount) ||
    requiredCount <= 0 ||
    requiredCount > 50
  ) {
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

function parseOptionalPositiveInteger(value: string, fallback: number) {
  const nextValue = value.trim() ? Number(value) : fallback;

  if (!Number.isInteger(nextValue) || nextValue < 0) {
    return null;
  }

  return nextValue;
}

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

function formatShiftText(shiftCount: number) {
  if (shiftCount === 1) return "1 vagt";
  return `${shiftCount} vagter`;
}

function formatFixedStaffingText(assignedShiftCount: number) {
  if (assignedShiftCount === 1) return "1 fast medarbejder";
  return `${assignedShiftCount} faste medarbejdere`;
}

function formatJobFunctionText(jobFunctionCount: number) {
  if (jobFunctionCount === 1) return "1 jobfunktion";
  return `${jobFunctionCount} jobfunktioner`;
}

function formatCopyTargetButtonText(targetCount: number) {
  if (targetCount === 0) return "Kopiér til valgte dage";
  if (targetCount === 1) return "Kopiér til 1 valgt dag";
  return `Kopiér til ${targetCount} valgte dage`;
}

function formatWeekdayCountText(dayCount: number) {
  if (dayCount === 1) return "1 ugedag";
  return `${dayCount} ugedage`;
}

function formatCopyTargetStatus(day: TemplateDay | null) {
  const summary = summarizeTemplateDayStaffing(day);

  if (summary.shiftCount === 0) {
    return "Tom modtagerdag";
  }

  const openShiftLabel = summary.openShiftCount > 0
    ? ` · ${formatOpenShiftText(summary.openShiftCount)}`
    : "";

  return `${formatShiftText(summary.shiftCount)} erstattes${openShiftLabel}`;
}

function formatTemplateCopyDayDetail(summary: {
  jobFunctionCount: number;
  shiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
}) {
  if (summary.shiftCount === 0) {
    return "Ingen vagter";
  }

  const parts = [
    formatShiftText(summary.shiftCount),
    formatJobFunctionText(summary.jobFunctionCount),
    formatFixedStaffingText(summary.assignedShiftCount),
  ];

  if (summary.openShiftCount > 0) {
    parts.push(formatOpenShiftText(summary.openShiftCount));
  }

  return parts.join(" · ");
}

function getCopyTargetWeekdays(selectedWeekday: number, weekdays: number[]) {
  return weekdays
    .filter((weekday) => weekday !== selectedWeekday)
    .sort((a, b) => a - b);
}

function getAssignedUserIdSet(item: TemplateJobFunction) {
  return new Set(
    (item.assignments ?? [])
      .map(getAssignmentUserId)
      .filter((userId): userId is number => userId !== null),
  );
}

export default function ScheduleTemplatesPage() {
  const infoDialog = useInfoModal();
  const infoDialogRef = useRef(infoDialog);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [employees, setEmployees] = useState<ScheduleTemplateUser[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [selectedWeekday, setSelectedWeekday] = useState(1);
  const [createTemplateForm, setCreateTemplateForm] =
    useState(emptyTemplateForm);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [dayForm, setDayForm] = useState(toDayForm(null));
  const [jobFunctionForm, setJobFunctionForm] = useState(emptyJobFunctionForm);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savingJobFunction, setSavingJobFunction] = useState(false);
  const [copyingDay, setCopyingDay] = useState(false);
  const [copyingTemplate, setCopyingTemplate] = useState(false);
  const [savingAssignmentKey, setSavingAssignmentKey] = useState<string | null>(
    null,
  );
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);
  const [expandedJobFunctionIds, setExpandedJobFunctionIds] = useState<
    Set<number>
  >(() => new Set());
  const [copyDayModalOpen, setCopyDayModalOpen] = useState(false);
  const [copyDayTargets, setCopyDayTargets] = useState<number[]>([]);
  const [copyTemplateModalOpen, setCopyTemplateModalOpen] = useState(false);
  const [copyTemplateName, setCopyTemplateName] = useState("");

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

  const selectedTemplateGaps = useMemo(() => {
    return getTemplateStaffingGaps(selectedTemplate);
  }, [selectedTemplate]);

  const selectedTemplateGapSummary = useMemo(() => {
    return summarizeStaffingGaps(selectedTemplateGaps);
  }, [selectedTemplateGaps]);

  const selectedDayGaps = useMemo(() => {
    return getDayStaffingGaps(selectedDay);
  }, [selectedDay]);

  const selectedDayGapSummary = useMemo(() => {
    return summarizeStaffingGaps(selectedDayGaps);
  }, [selectedDayGaps]);

  const selectedDayStaffingSummary = useMemo(() => {
    return summarizeTemplateDayStaffing(selectedDay);
  }, [selectedDay]);

  const selectedTemplateStaffingSummary = useMemo(() => {
    return summarizeTemplateStaffing(selectedTemplate);
  }, [selectedTemplate]);

  const selectedTemplateCopyDaySummaries = useMemo(() => {
    return summarizeTemplateCopyDays(selectedTemplate);
  }, [selectedTemplate]);

  const copyTemplateNameExists = useMemo(() => {
    return scheduleTemplateNameExists({
      templates,
      name: copyTemplateName,
      ignoredTemplateId: selectedTemplate?.id,
    });
  }, [copyTemplateName, selectedTemplate?.id, templates]);

  const activeTemplates = templates.filter((template) => template.isActive).length;
  const archivedTemplates = templates.length - activeTemplates;
  const totalStaffingGapSummary = templates.reduce(
    (summary, template) => {
      const templateSummary = getTemplateStaffingGapSummary(template);

      return {
        jobFunctionCount: summary.jobFunctionCount + templateSummary.jobFunctionCount,
        missingShiftCount: summary.missingShiftCount + templateSummary.missingShiftCount,
      };
    },
    { jobFunctionCount: 0, missingShiftCount: 0 },
  );

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

  useEffect(() => {
    setTemplateForm(
      selectedTemplate ? toTemplateForm(selectedTemplate) : emptyTemplateForm,
    );
    setEditingTemplate(false);
    setCopyTemplateModalOpen(false);
    setCopyTemplateName("");
  }, [selectedTemplate]);

  useEffect(() => {
    setDayForm(toDayForm(selectedDay));
    setJobFunctionForm(emptyJobFunctionForm);
    setExpandedJobFunctionIds(new Set());
    setCopyDayModalOpen(false);
    setCopyDayTargets([]);
  }, [selectedDay, selectedWeekday]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [templatesResponse, jobFunctionsResponse, usersResponse] =
        await Promise.all([
          apiFetch(
            appendCinemaId(
              `/schedule-templates?includeArchived=${showArchived}`,
              activeCinemaId,
            ),
          ),
          apiFetch(
            appendCinemaId(
              "/job-functions?includeArchived=false",
              activeCinemaId,
            ),
          ),
          apiFetch(appendCinemaId("/users", activeCinemaId)),
        ]);

      if (!templatesResponse.ok) {
        throw new Error(
          await readErrorMessage(
            templatesResponse,
            "Kunne ikke hente vagtsskabeloner",
          ),
        );
      }

      if (!jobFunctionsResponse.ok) {
        throw new Error(
          await readErrorMessage(
            jobFunctionsResponse,
            "Kunne ikke hente jobfunktioner",
          ),
        );
      }

      if (!usersResponse.ok) {
        throw new Error(
          await readErrorMessage(usersResponse, "Kunne ikke hente medarbejdere"),
        );
      }

      const [templatesData, jobFunctionsData, usersData] = await Promise.all([
        templatesResponse.json(),
        jobFunctionsResponse.json(),
        usersResponse.json(),
      ]);

      const nextTemplates = Array.isArray(templatesData)
        ? (templatesData as ScheduleTemplate[])
        : [];

      setTemplates(nextTemplates);
      setJobFunctions(
        Array.isArray(jobFunctionsData)
          ? (jobFunctionsData as JobFunction[]).filter(
              (jobFunction) => jobFunction.isActive,
            )
          : [],
      );
      setEmployees(
        Array.isArray(usersData)
          ? (usersData as ScheduleTemplateUser[]).filter(
              (employee) =>
                employee.isActive !== false && employee.role !== "MASTER",
            )
          : [],
      );
      setSelectedTemplateId((current) => {
        if (current && nextTemplates.some((template) => template.id === current)) {
          return current;
        }

        return nextTemplates[0]?.id ?? null;
      });
    } catch (error) {
      setTemplates([]);
      setJobFunctions([]);
      setEmployees([]);
      infoDialogRef.current.showError(
        "Kunne ikke hente vagtsskabeloner",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da vagtsskabeloner skulle hentes.\nPrøv igen.",
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
      setEmployees([]);
      setLoading(false);
      return;
    }

    fetchData();
  }, [currentUser, fetchData, needsMasterCinemaSelection]);

  const createTemplate = async (event: FormEvent) => {
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
        ...parseTemplateForm(createTemplateForm),
        cinemaId: activeCinemaId,
      };

      const response = await apiFetch("/schedule-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke oprette vagtsskabelon"),
        );
      }

      const createdTemplate = (await response.json()) as ScheduleTemplate;
      await fetchData();
      setSelectedTemplateId(createdTemplate.id);
      setCreateTemplateForm(emptyTemplateForm);
      setCreateTemplateModalOpen(false);
      infoDialog.show({
        title: "Vagtsskabelon oprettet",
        description:
          "Skabelonen er oprettet.\nVælg ugedage, jobfunktioner og faste medarbejdere, før den bruges i vagtplanlægningen.",
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke oprette vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
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
        throw new Error(
          await readErrorMessage(response, "Kunne ikke opdatere vagtsskabelon"),
        );
      }

      await fetchData();
      setEditingTemplate(false);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const archiveTemplate = async (template: ScheduleTemplate) => {
    if (!window.confirm(`Vil du arkivere vagtsskabelonen "${template.name}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(
        appendCinemaId(`/schedule-templates/${template.id}`, activeCinemaId),
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke arkivere vagtsskabelon"),
        );
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke arkivere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  const reactivateTemplate = async (template: ScheduleTemplate) => {
    try {
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${template.id}/reactivate`,
          activeCinemaId,
        ),
        { method: "PATCH" },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke genaktivere vagtsskabelon"),
        );
      }

      await fetchData();
      setSelectedTemplateId(template.id);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke genaktivere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
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
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingDay(false);
    }
  };

  const addJobFunction = async (event: FormEvent) => {
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
        throw new Error(
          await readErrorMessage(response, "Kunne ikke tilføje jobfunktion"),
        );
      }

      setJobFunctionForm(emptyJobFunctionForm);
      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke tilføje jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
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

    const nextRequiredCount = updates.requiredCount ?? item.requiredCount;
    const assignedCount = countAssignedTemplateUsers(item.assignments);

    if (nextRequiredCount < assignedCount) {
      infoDialog.showError(
        "Antal vagter er for lavt",
        `Antal vagter kan ikke være lavere end antal faste medarbejdere (${assignedCount}).\nFjern faste medarbejdere først, eller hæv antal vagter.`,
      );
      return;
    }

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
        throw new Error(
          await readErrorMessage(response, "Kunne ikke opdatere jobfunktion"),
        );
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke opdatere jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  const removeTemplateJobFunction = async (item: TemplateJobFunction) => {
    if (!selectedTemplate) return;

    if (
      !window.confirm(
        `Vil du fjerne "${item.jobFunction.name}" fra ${formatWeekday(selectedWeekday)}?`,
      )
    ) {
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
        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne jobfunktion"),
        );
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne jobfunktion",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    }
  };

  const addTemplateAssignment = async (
    item: TemplateJobFunction,
    userIdValue: number | string,
  ) => {
    if (!selectedTemplate) return;

    const userId = Number(userIdValue);
    if (!Number.isInteger(userId) || userId <= 0) return;

    const alreadyAssigned = (item.assignments ?? []).some(
      (assignment) => getAssignmentUserId(assignment) === userId,
    );

    if (alreadyAssigned) return;

    if (countAssignedTemplateUsers(item.assignments) >= item.requiredCount) {
      infoDialog.showError(
        "Alle vagter har fast medarbejder",
        "Hæv antal vagter på jobfunktionen, hvis der skal tilføjes flere faste medarbejdere.",
      );
      return;
    }

    const key = `${item.id}:add`;

    try {
      setSavingAssignmentKey(key);
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/day-job-functions/${item.id}/assignments`,
          activeCinemaId,
        ),
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            sortOrder: item.assignments?.length ?? 0,
            cinemaId: activeCinemaId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke tildele medarbejder"),
        );
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke tildele medarbejder",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingAssignmentKey(null);
    }
  };

  const removeTemplateAssignment = async (
    item: TemplateJobFunction,
    assignment: ScheduleTemplateAssignment,
  ) => {
    if (!selectedTemplate) return;

    const key = `${item.id}:remove:${assignment.id}`;

    try {
      setSavingAssignmentKey(key);
      const response = await apiFetch(
        appendCinemaId(
          `/schedule-templates/${selectedTemplate.id}/day-job-functions/${item.id}/assignments/${assignment.id}`,
          activeCinemaId,
        ),
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne medarbejder"),
        );
      }

      await fetchData();
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne medarbejder",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setSavingAssignmentKey(null);
    }
  };

  const toggleJobFunctionDetails = (id: number) => {
    setExpandedJobFunctionIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const openCopyTemplateModal = () => {
    if (!selectedTemplate) return;

    setCopyTemplateName(
      getUniqueCopiedScheduleTemplateName({
        sourceName: selectedTemplate.name,
        templates,
        ignoredTemplateId: selectedTemplate.id,
      }),
    );
    setCopyTemplateModalOpen(true);
  };

  const copySelectedTemplate = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedTemplate) return;

    const nextTemplateName = copyTemplateName.trim();

    if (!nextTemplateName) {
      infoDialog.showError(
        "Navn mangler",
        "Indtast et navn på den nye vagtsskabelon.",
      );
      return;
    }

    if (copyTemplateNameExists) {
      infoDialog.showError(
        "Skabelonnavn findes allerede",
        "Vælg et andet navn til kopien, så den er nem at kende fra den eksisterende skabelon.",
      );
      return;
    }

    try {
      setCopyingTemplate(true);

      const createdTemplate = await copyScheduleTemplate({
        sourceTemplate: selectedTemplate,
        newTemplateName: nextTemplateName,
        activeCinemaId,
      });

      await fetchData();
      setSelectedTemplateId(createdTemplate.id);
      setSelectedWeekday(1);
      setCopyTemplateModalOpen(false);
      setCopyTemplateName("");
      infoDialog.show({
        title: "Vagtsskabelon kopieret",
        description: `"${selectedTemplate.name}" er kopieret til "${nextTemplateName}".`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke kopiere vagtsskabelon",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setCopyingTemplate(false);
    }
  };

  const openCopyDayModal = () => {
    if (!selectedTemplate || !selectedDay) {
      infoDialog.showError(
        "Ugedag mangler",
        "Gem ugedagen først, før den kopieres til andre dage.",
      );
      return;
    }

    setCopyDayTargets([]);
    setCopyDayModalOpen(true);
  };

  const toggleCopyDayTarget = (weekday: number) => {
    setCopyDayTargets((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((a, b) => a - b),
    );
  };

  const selectCopyDayTargets = (weekdays: number[]) => {
    setCopyDayTargets(getCopyTargetWeekdays(selectedWeekday, weekdays));
  };

  const copySelectedDayToTargets = async () => {
    if (!selectedTemplate || !selectedDay) return;

    if (copyDayTargets.length === 0) {
      infoDialog.showError(
        "Vælg modtagerdage",
        "Vælg mindst én ugedag, som den valgte dag skal kopieres til.",
      );
      return;
    }

    try {
      setCopyingDay(true);

      for (const targetWeekday of copyDayTargets) {
        const targetDay = getTemplateDay(selectedTemplate, targetWeekday);

        for (const item of targetDay?.jobFunctions ?? []) {
          const deleteResponse = await apiFetch(
            appendCinemaId(
              `/schedule-templates/${selectedTemplate.id}/day-job-functions/${item.id}`,
              activeCinemaId,
            ),
            { method: "DELETE" },
          );

          if (!deleteResponse.ok) {
            throw new Error(
              await readErrorMessage(deleteResponse, "Kunne ikke rydde modtagerdag"),
            );
          }
        }

        const dayResponse = await apiFetch(
          appendCinemaId(
            `/schedule-templates/${selectedTemplate.id}/days/${targetWeekday}`,
            activeCinemaId,
          ),
          {
            method: "PATCH",
            body: JSON.stringify({
              isActive: selectedDay.isActive,
              note: selectedDay.note,
              sortOrder: selectedDay.sortOrder,
              cinemaId: activeCinemaId,
            }),
          },
        );

        if (!dayResponse.ok) {
          throw new Error(
            await readErrorMessage(dayResponse, "Kunne ikke kopiere ugedag"),
          );
        }

        for (const item of selectedDay.jobFunctions) {
          const createResponse = await apiFetch(
            appendCinemaId(
              `/schedule-templates/${selectedTemplate.id}/days/${targetWeekday}/job-functions`,
              activeCinemaId,
            ),
            {
              method: "POST",
              body: JSON.stringify({
                jobFunctionId: item.jobFunctionId,
                requiredCount: item.requiredCount,
                sortOrder: item.sortOrder,
                note: item.note,
                cinemaId: activeCinemaId,
              }),
            },
          );

          if (!createResponse.ok) {
            throw new Error(
              await readErrorMessage(createResponse, "Kunne ikke kopiere jobfunktion"),
            );
          }

          const createdItem = (await createResponse
            .json()
            .catch(() => null)) as TemplateJobFunction | null;

          if (!createdItem?.id) continue;

          for (const assignment of item.assignments ?? []) {
            const userId = getAssignmentUserId(assignment);
            if (!userId) continue;

            const assignmentResponse = await apiFetch(
              appendCinemaId(
                `/schedule-templates/${selectedTemplate.id}/day-job-functions/${createdItem.id}/assignments`,
                activeCinemaId,
              ),
              {
                method: "POST",
                body: JSON.stringify({
                  userId,
                  sortOrder: assignment.sortOrder ?? 0,
                  cinemaId: activeCinemaId,
                }),
              },
            );

            if (!assignmentResponse.ok) {
              throw new Error(
                await readErrorMessage(
                  assignmentResponse,
                  "Kunne ikke kopiere faste medarbejdere",
                ),
              );
            }
          }
        }
      }

      await fetchData();
      setCopyDayModalOpen(false);
      setCopyDayTargets([]);
      infoDialog.show({
        title: "Ugedag kopieret",
        description: `${formatWeekday(selectedWeekday)} er kopieret til ${copyDayTargets.length} ugedag${
          copyDayTargets.length === 1 ? "" : "e"
        }.`,
        variant: "success",
        buttonText: "OK",
      });
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke kopiere ugedag",
        error instanceof Error ? error.message : "Der opstod en fejl.\nPrøv igen.",
      );
    } finally {
      setCopyingDay(false);
    }
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-6 text-gray-950 dark:bg-gray-950 dark:text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
              Vagtplanlægning
            </p>
            <h1 className="text-3xl font-black">Vagtsskabeloner</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
              Opret de skabeloner, der senere kan vælges på konkrete datoer i
              vagtplanlægningen. En skabelon består af ugedage, jobfunktioner og
              faste medarbejdere.
            </p>
          </div>

          {needsMasterCinemaSelection && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Ingen aktiv biograf valgt
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Vælg biograf før vagtsskabeloner
              </h2>
              <p className="mt-2 max-w-3xl text-sm">
                MASTER skal vælge en aktiv biograf, før vagtsskabeloner kan
                oprettes eller redigeres. Skabelonerne knyttes til den valgte
                biograf og bruges i vagtplanlægningen.
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
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Vist
                  </p>
                  <p className="mt-2 text-3xl font-black">{templates.length}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Aktive
                  </p>
                  <p className="mt-2 text-3xl font-black">{activeTemplates}</p>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Arkiverede
                  </p>
                  <p className="mt-2 text-3xl font-black">{archivedTemplates}</p>
                </div>
                <div
                  className={`rounded-3xl border p-5 ${
                    totalStaffingGapSummary.missingShiftCount > 0
                      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                      : "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    Åbne vagter
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {totalStaffingGapSummary.missingShiftCount}
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    {totalStaffingGapSummary.missingShiftCount > 0
                      ? "oprettes uden fast medarbejder"
                      : "alle viste skabeloner er fast bemandet"}
                  </p>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <aside className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
                    <div>
                      <h2 className="text-xl font-black">Vagtsskabeloner</h2>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Vælg en skabelon for at redigere ugedage og jobfunktioner.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateTemplateForm(emptyTemplateForm);
                        setCreateTemplateModalOpen(true);
                      }}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Opret vagtsskabelon
                    </button>
                  </div>

                  <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(event) => setShowArchived(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Vis arkiverede
                  </label>

                  <div className="mt-4 flex flex-col gap-3">
                    {loading && (
                      <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                        Henter vagtsskabeloner...
                      </p>
                    )}

                    {!loading && templates.length === 0 && (
                      <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                        Der er endnu ingen vagtsskabeloner for den valgte biograf.
                      </p>
                    )}

                    {templates.map((template) => {
                      const selected = selectedTemplateId === template.id;
                      const templateGapSummary =
                        getTemplateStaffingGapSummary(template);

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
                                {formatWeekParity(template.weekParity)} ·{" "}
                                {template.days?.length ?? 0} ugedage ·{" "}
                                {getTemplateJobFunctionCount(template)} vagter
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                template.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                                  : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              }`}
                            >
                              {template.isActive ? "Aktiv" : "Arkiveret"}
                            </span>
                          </div>

                          <div className="mt-3">
                            {templateGapSummary.missingShiftCount > 0 ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                                {formatOpenShiftText(
                                  templateGapSummary.missingShiftCount,
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 dark:bg-green-950/50 dark:text-green-100">
                                Fast bemandet
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <section className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  {!selectedTemplate && (
                    <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                      Opret eller vælg en vagtsskabelon for at redigere ugedage
                      og jobfunktioner.
                    </p>
                  )}

                  {selectedTemplate && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                            Valgt skabelon
                          </p>
                          <h2 className="text-2xl font-black">
                            {selectedTemplate.name}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
                            onClick={openCopyTemplateModal}
                            className="rounded-2xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950/40"
                            disabled={copyingTemplate}
                          >
                            Kopiér skabelon
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTemplate((current) => !current)}
                            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            {editingTemplate ? "Luk stamdata" : "Redigér stamdata"}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                        <p className="font-black">Ændringer gælder fremtidig generering</p>
                        <p className="mt-1">
                          Allerede oprettede vagter ændres ikke automatisk, når
                          denne skabelon justeres.
                        </p>
                      </div>

                      {selectedTemplateGapSummary.missingShiftCount > 0 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-black">
                                {formatOpenShiftText(
                                  selectedTemplateGapSummary.missingShiftCount,
                                )} i skabelonen
                              </p>
                              <p className="mt-1 text-sm">
                                De oprettes uden fast medarbejder i /shift-planning,
                                så medarbejderne kan ønske dem som åbne vagter.
                              </p>
                            </div>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-900/60 dark:text-amber-50">
                              {selectedTemplateGapSummary.jobFunctionCount} jobfunktioner
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {weekdayOptions.map((weekday) => {
                              const gapsForDay = selectedTemplateGaps.filter(
                                (gap) => gap.weekday === weekday.value,
                              );
                              const daySummary = summarizeStaffingGaps(gapsForDay);

                              if (daySummary.missingShiftCount === 0) return null;

                              return (
                                <div
                                  key={weekday.value}
                                  className="rounded-2xl bg-white/70 p-3 text-sm dark:bg-gray-950/40"
                                >
                                  <p className="font-black">
                                    {weekday.label}: {formatOpenShiftText(daySummary.missingShiftCount)}
                                  </p>
                                  <p className="mt-1 text-xs">
                                    {gapsForDay
                                      .map(
                                        (gap) =>
                                          `${gap.jobFunctionName} (${gap.missingCount})`,
                                      )
                                      .join(", ")}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {editingTemplate && (
                        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
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
                          const dayGapSummary = summarizeStaffingGaps(
                            getDayStaffingGaps(day),
                          );

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
                              {dayGapSummary.missingShiftCount > 0 && (
                                <p className="mt-2 rounded-full bg-amber-100 px-2 py-1 text-center text-[11px] font-black text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                                  {formatOpenShiftText(dayGapSummary.missingShiftCount)}
                                </p>
                              )}
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
                            <h3 className="text-xl font-black">
                              {formatWeekday(selectedWeekday)}
                            </h3>
                            {selectedDayGapSummary.missingShiftCount > 0 && (
                              <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">
                                {formatOpenShiftText(
                                  selectedDayGapSummary.missingShiftCount,
                                )} oprettes uden fast medarbejder på denne ugedag.
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={openCopyDayModal}
                              className="rounded-2xl border border-blue-300 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950/40"
                              disabled={!selectedDay || copyingDay}
                            >
                              Kopiér ugedag
                            </button>
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
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_140px]">
                          <label className="block text-sm font-semibold">
                            Note
                            <input
                              value={dayForm.note}
                              onChange={(event) =>
                                setDayForm((current) => ({
                                  ...current,
                                  note: event.target.value,
                                }))
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
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Fast medarbejder er frivilligt. Vagter uden fast
                            medarbejder vises som åbne vagter i skabelonen.
                          </p>
                        </div>

                        <form
                          className="mt-4 grid gap-3 lg:grid-cols-[1fr_130px_130px]"
                          onSubmit={addJobFunction}
                        >
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
                            Der er ingen aktive jobfunktioner. Opret eller aktivér
                            jobfunktioner før skabelonen kan bemandes.
                          </p>
                        )}

                        <div className="mt-5 flex flex-col gap-3">
                          {(selectedDay?.jobFunctions ?? []).length === 0 && (
                            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                              Der er ingen jobfunktioner på denne ugedag endnu.
                            </p>
                          )}

                          {(selectedDay?.jobFunctions ?? []).map((item) => {
                            const expanded = expandedJobFunctionIds.has(item.id);
                            const assignedCount = countAssignedTemplateUsers(
                              item.assignments,
                            );
                            const missingCount = getJobFunctionStaffingGap(item);
                            const assignedUserIds = getAssignedUserIdSet(item);
                            const availableEmployees = employees.filter(
                              (employee) => !assignedUserIds.has(employee.id),
                            );

                            return (
                              <div
                                key={item.id}
                                className={`rounded-3xl border p-4 ${
                                  missingCount > 0
                                    ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"
                                    : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                                }`}
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: item.jobFunction.color }}
                                      />
                                      <h4 className="text-lg font-black">
                                        {item.jobFunction.name}
                                      </h4>
                                      {missingCount > 0 ? (
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                                          {formatOpenShiftText(missingCount)}
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 dark:bg-green-950/60 dark:text-green-100">
                                          Fast bemandet
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                      {formatDayPeriod(item.jobFunction.dayPeriod)} ·{" "}
                                      {assignedCount}/{item.requiredCount} faste
                                      medarbejdere
                                    </p>
                                    {item.note && (
                                      <p className="mt-2 rounded-2xl bg-white p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                        {item.note}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleJobFunctionDetails(item.id)}
                                      className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-white dark:border-gray-700 dark:hover:bg-gray-900"
                                    >
                                      {expanded ? "Skjul detaljer" : "Vis detaljer"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeTemplateJobFunction(item)}
                                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                                    >
                                      Fjern
                                    </button>
                                  </div>
                                </div>

                                {missingCount > 0 && (
                                  <div className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                                    <p className="font-black">Åben vagt fra skabelonen</p>
                                    <p className="mt-1">
                                      Når skabelonen bruges i vagtplanlægningen,
                                      oprettes {formatOpenShiftText(missingCount)} uden
                                      fast medarbejder, så medarbejderne kan ønske dem.
                                    </p>
                                  </div>
                                )}

                                {expanded && (
                                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                                    <div className="rounded-2xl bg-white p-4 dark:bg-gray-900">
                                      <p className="font-black">Faste medarbejdere</p>
                                      <div className="mt-3 flex flex-col gap-2">
                                        {(item.assignments ?? []).length === 0 && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Ingen faste medarbejdere valgt.
                                          </p>
                                        )}
                                        {(item.assignments ?? []).map((assignment) => {
                                          const removeKey = `${item.id}:remove:${assignment.id}`;

                                          return (
                                            <div
                                              key={assignment.id}
                                              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-800"
                                            >
                                              <span className="text-sm font-semibold">
                                                {formatUserName(assignment.user)}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeTemplateAssignment(item, assignment)
                                                }
                                                className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                                                disabled={savingAssignmentKey === removeKey}
                                              >
                                                {savingAssignmentKey === removeKey
                                                  ? "Fjerner..."
                                                  : "Fjern"}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      <label className="mt-3 block text-sm font-semibold">
                                        Tilføj fast medarbejder
                                        <select
                                          defaultValue=""
                                          onChange={(event) => {
                                            const selectedValue = event.target.value;
                                            event.currentTarget.value = "";
                                            addTemplateAssignment(item, selectedValue);
                                          }}
                                          className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                          disabled={
                                            savingAssignmentKey === `${item.id}:add` ||
                                            availableEmployees.length === 0 ||
                                            assignedCount >= item.requiredCount
                                          }
                                        >
                                          <option value="">
                                            {assignedCount >= item.requiredCount
                                              ? "Alle vagter har fast medarbejder"
                                              : "Vælg medarbejder"}
                                          </option>
                                          {availableEmployees.map((employee) => (
                                            <option key={employee.id} value={employee.id}>
                                              {formatUserName(employee)}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    </div>

                                    <div className="rounded-2xl bg-white p-4 dark:bg-gray-900">
                                      <p className="font-black">Indstillinger</p>
                                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <label className="block text-sm font-semibold">
                                          Antal vagter
                                          <input
                                            key={`required-${item.id}-${item.requiredCount}`}
                                            type="number"
                                            min="1"
                                            max="50"
                                            defaultValue={item.requiredCount}
                                            onBlur={(event) => {
                                              const value = parseOptionalPositiveInteger(
                                                event.currentTarget.value,
                                                item.requiredCount,
                                              );

                                              if (!value || value < 1 || value > 50) {
                                                event.currentTarget.value = String(
                                                  item.requiredCount,
                                                );
                                                return;
                                              }

                                              if (value !== item.requiredCount) {
                                                updateTemplateJobFunction(item, {
                                                  requiredCount: value,
                                                });
                                              }
                                            }}
                                            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                          />
                                        </label>
                                        <label className="block text-sm font-semibold">
                                          Sortering
                                          <input
                                            key={`sort-${item.id}-${item.sortOrder}`}
                                            type="number"
                                            min="0"
                                            defaultValue={item.sortOrder}
                                            onBlur={(event) => {
                                              const value = parseOptionalPositiveInteger(
                                                event.currentTarget.value,
                                                item.sortOrder,
                                              );

                                              if (value === null) {
                                                event.currentTarget.value = String(
                                                  item.sortOrder,
                                                );
                                                return;
                                              }

                                              if (value !== item.sortOrder) {
                                                updateTemplateJobFunction(item, {
                                                  sortOrder: value,
                                                });
                                              }
                                            }}
                                            className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                          />
                                        </label>
                                        <label className="block text-sm font-semibold sm:col-span-2">
                                          Note
                                          <textarea
                                            key={`note-${item.id}-${item.note ?? ""}`}
                                            defaultValue={item.note ?? ""}
                                            onBlur={(event) => {
                                              const value =
                                                event.currentTarget.value.trim() || null;

                                              if (value !== item.note) {
                                                updateTemplateJobFunction(item, {
                                                  note: value,
                                                });
                                              }
                                            }}
                                            className="mt-1 min-h-20 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </section>
            </>
          )}
        </div>

        {createTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-gray-900 dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                    Ny skabelon
                  </p>
                  <h2 className="text-2xl font-black">Opret vagtsskabelon</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateTemplateModalOpen(false)}
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Luk
                </button>
              </div>

              <form className="mt-5 grid gap-3" onSubmit={createTemplate}>
                <label className="block text-sm font-semibold">
                  Navn
                  <input
                    value={createTemplateForm.name}
                    onChange={(event) =>
                      setCreateTemplateForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    autoFocus
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Ugeregel
                  <select
                    value={createTemplateForm.weekParity}
                    onChange={(event) =>
                      setCreateTemplateForm((current) => ({
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
                <label className="block text-sm font-semibold">
                  Beskrivelse
                  <textarea
                    value={createTemplateForm.description}
                    onChange={(event) =>
                      setCreateTemplateForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-24 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Sortering
                  <input
                    type="number"
                    min="0"
                    value={createTemplateForm.sortOrder}
                    onChange={(event) =>
                      setCreateTemplateForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={savingTemplate}
                >
                  {savingTemplate ? "Opretter..." : "Opret vagtsskabelon"}
                </button>
              </form>
            </div>
          </div>
        )}

        {copyTemplateModalOpen && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-gray-900 dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                    Kopiér skabelon
                  </p>
                  <h2 className="text-2xl font-black">
                    Kopiér {selectedTemplate.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Den nye skabelon får samme ugedage, jobfunktioner, faste
                    medarbejdere og åbne vagter. Allerede oprettede vagter
                    påvirkes ikke.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCopyTemplateModalOpen(false)}
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
                  disabled={copyingTemplate}
                >
                  Luk
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  Det kopieres
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                    {formatWeekdayCountText(selectedTemplateStaffingSummary.dayCount)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                    {formatShiftText(selectedTemplateStaffingSummary.shiftCount)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                    {formatJobFunctionText(
                      selectedTemplateStaffingSummary.jobFunctionCount,
                    )}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                    {formatFixedStaffingText(
                      selectedTemplateStaffingSummary.assignedShiftCount,
                    )}
                  </span>
                  {selectedTemplateStaffingSummary.openShiftCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                      {formatOpenShiftText(
                        selectedTemplateStaffingSummary.openShiftCount,
                      )}
                    </span>
                  )}
                </div>
              </div>

              {selectedTemplateCopyDaySummaries.length > 0 && (
                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                  <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    Ugedage i kopien
                  </p>
                  <div className="mt-2 space-y-2">
                    {selectedTemplateCopyDaySummaries.map((daySummary) => (
                      <div
                        key={daySummary.weekday}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-900"
                      >
                        <div>
                          <p className="font-black text-gray-950 dark:text-white">
                            {formatWeekday(daySummary.weekday)}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {formatTemplateCopyDayDetail(daySummary)}
                          </p>
                        </div>
                        {!daySummary.isActive && (
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Inaktiv
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={copySelectedTemplate} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold">
                  Navn på ny skabelon
                  <input
                    value={copyTemplateName}
                    onChange={(event) => setCopyTemplateName(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white p-3 text-gray-950 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder={`Kopi af ${selectedTemplate.name}`}
                    autoFocus
                    disabled={copyingTemplate}
                  />
                  {copyTemplateNameExists && (
                    <span className="mt-2 block rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                      Der findes allerede en skabelon med dette navn. Vælg et
                      andet navn til kopien.
                    </span>
                  )}
                </label>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={copyingTemplate || copyTemplateNameExists}
                >
                  {copyingTemplate
                    ? "Kopierer..."
                    : copyTemplateNameExists
                      ? "Vælg et andet navn"
                      : "Opret kopi"}
                </button>
              </form>
            </div>
          </div>
        )}

        {copyDayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 text-gray-950 shadow-2xl dark:bg-gray-900 dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                    Kopiér ugedag
                  </p>
                  <h2 className="text-2xl font-black">
                    Kopiér {formatWeekday(selectedWeekday).toLowerCase()}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Modtagerdage ryddes først og får derefter samme jobfunktioner
                    og faste medarbejdere.
                  </p>
                  {selectedDayGapSummary.missingShiftCount > 0 && (
                    <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                      {formatOpenShiftText(
                        selectedDayGapSummary.missingShiftCount,
                      )}{" "}
                      uden fast medarbejder kopieres også som åbne vagter, som
                      medarbejderne kan ønske.
                    </p>
                  )}
                  <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                    <p className="font-black uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                      Det kopieres
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                        {formatShiftText(selectedDayStaffingSummary.shiftCount)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                        {formatJobFunctionText(
                          selectedDayStaffingSummary.jobFunctionCount,
                        )}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 dark:bg-gray-900">
                        {formatFixedStaffingText(
                          selectedDayStaffingSummary.assignedShiftCount,
                        )}
                      </span>
                      {selectedDayStaffingSummary.openShiftCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                          {formatOpenShiftText(
                            selectedDayStaffingSummary.openShiftCount,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCopyDayModalOpen(false)}
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Luk
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selectCopyDayTargets([1, 2, 3, 4, 5])}
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Vælg hverdage
                </button>
                <button
                  type="button"
                  onClick={() => selectCopyDayTargets([6, 7])}
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Vælg weekend
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectCopyDayTargets(
                      weekdayOptions.map((weekday) => weekday.value),
                    )
                  }
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Vælg alle
                </button>
                <button
                  type="button"
                  onClick={() => setCopyDayTargets([])}
                  className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-black hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Ryd valg
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {weekdayOptions
                  .filter((weekday) => weekday.value !== selectedWeekday)
                  .map((weekday) => {
                    const targetDay = getTemplateDay(selectedTemplate, weekday.value);

                    return (
                      <label
                        key={weekday.value}
                        className="flex items-start gap-3 rounded-2xl border border-gray-200 p-3 text-sm font-semibold dark:border-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={copyDayTargets.includes(weekday.value)}
                          onChange={() => toggleCopyDayTarget(weekday.value)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <span>
                          <span className="block">{weekday.label}</span>
                          <span className="mt-0.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {formatCopyTargetStatus(targetDay)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={copySelectedDayToTargets}
                className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={copyingDay}
              >
                {copyingDay
                  ? "Kopierer..."
                  : formatCopyTargetButtonText(copyDayTargets.length)}
              </button>
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
