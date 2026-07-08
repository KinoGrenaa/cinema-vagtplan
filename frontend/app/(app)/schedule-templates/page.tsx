"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import ScheduleTemplateCopyDayModal from "./components/ScheduleTemplateCopyDayModal";
import ScheduleTemplateCopyModal from "./components/ScheduleTemplateCopyModal";
import ScheduleTemplateCreateModal from "./components/ScheduleTemplateCreateModal";
import ScheduleTemplateDaySettings from "./components/ScheduleTemplateDaySettings";
import ScheduleTemplateJobFunctionsSection from "./components/ScheduleTemplateJobFunctionsSection";
import ScheduleTemplateList from "./components/ScheduleTemplateList";
import ScheduleTemplateSelectedHeader from "./components/ScheduleTemplateSelectedHeader";
import ScheduleTemplateSummaryCards from "./components/ScheduleTemplateSummaryCards";
import ScheduleTemplateWeekdayTabs from "./components/ScheduleTemplateWeekdayTabs";

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
  getTemplateStaffingGaps,
  getTemplateStaffingGapSummary,
  summarizeStaffingGaps,
  summarizeTemplateDayStaffing,
} from "./helpers/scheduleTemplateStaffingGaps";

import {
  appendCinemaId,
  formatWeekday,
  getAssignmentUserId,
  getCopyTargetWeekdays,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  getTemplateDay,
  readErrorMessage,
  weekdayOptions,
} from "./helpers/scheduleTemplatePageHelpers";
import {
  emptyJobFunctionForm,
  emptyTemplateForm,
  parseDayForm,
  parseJobFunctionForm,
  parseTemplateForm,
  toDayForm,
  toTemplateForm,
} from "./helpers/scheduleTemplateFormHelpers";
import type {
  CurrentUser,
  JobFunction,
  ScheduleTemplate,
  ScheduleTemplateAssignment,
  ScheduleTemplateUser,
  TemplateJobFunction,
} from "./helpers/scheduleTemplatePageTypes";


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
  const [copyTemplateIncludeAssignments, setCopyTemplateIncludeAssignments] =
    useState(true);
  const [copyTemplateIncludeInactiveDays, setCopyTemplateIncludeInactiveDays] =
    useState(true);
  const [copyTemplateIncludeNotes, setCopyTemplateIncludeNotes] = useState(true);

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

  const copyDayTargetOptions = useMemo(() => {
    return weekdayOptions
      .filter((weekday) => weekday.value !== selectedWeekday)
      .map((weekday) => ({
        weekday,
        day: getTemplateDay(selectedTemplate, weekday.value),
      }));
  }, [selectedTemplate, selectedWeekday]);

  const selectedTemplateInactiveDayCount = useMemo(() => {
    return (selectedTemplate?.days ?? []).filter((day) => !day.isActive).length;
  }, [selectedTemplate]);

  const selectedTemplateStaffingSummary = useMemo(() => {
    return summarizeTemplateStaffing(selectedTemplate, {
      includeInactiveDays: copyTemplateIncludeInactiveDays,
    });
  }, [copyTemplateIncludeInactiveDays, selectedTemplate]);

  const copiedTemplateOpenShiftCount = copyTemplateIncludeAssignments
    ? selectedTemplateStaffingSummary.openShiftCount
    : selectedTemplateStaffingSummary.shiftCount;

  const selectedTemplateCopyDaySummaries = useMemo(() => {
    return summarizeTemplateCopyDays(selectedTemplate, {
      includeInactiveDays: copyTemplateIncludeInactiveDays,
    });
  }, [copyTemplateIncludeInactiveDays, selectedTemplate]);

  const copyTemplateNameExists = useMemo(() => {
    return scheduleTemplateNameExists({
      templates,
      name: copyTemplateName,
      ignoredTemplateId: selectedTemplate?.id,
    });
  }, [copyTemplateName, selectedTemplate?.id, templates]);

  const copyTemplateNameIsBlank = copyTemplateName.trim().length === 0;
  const copyTemplateHasNoDays = selectedTemplateStaffingSummary.dayCount === 0;

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
    setCopyTemplateIncludeAssignments(true);
    setCopyTemplateIncludeInactiveDays(true);
    setCopyTemplateIncludeNotes(true);
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

    if (copyTemplateHasNoDays) {
      infoDialog.showError(
        "Ingen ugedage valgt",
        "Kopien skal indeholde mindst én ugedag. Slå inaktive ugedage til igen, eller vælg en skabelon med aktive ugedage.",
      );
      return;
    }

    try {
      setCopyingTemplate(true);

      const createdTemplate = await copyScheduleTemplate({
        sourceTemplate: selectedTemplate,
        newTemplateName: nextTemplateName,
        activeCinemaId,
        includeAssignments: copyTemplateIncludeAssignments,
        includeInactiveDays: copyTemplateIncludeInactiveDays,
        includeNotes: copyTemplateIncludeNotes,
      });

      await fetchData();
      setSelectedTemplateId(createdTemplate.id);
      setSelectedWeekday(1);
      setCopyTemplateModalOpen(false);
      setCopyTemplateName("");
      setCopyTemplateIncludeAssignments(true);
      setCopyTemplateIncludeInactiveDays(true);
      setCopyTemplateIncludeNotes(true);
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
              <ScheduleTemplateSummaryCards
                totalCount={templates.length}
                activeCount={activeTemplates}
                archivedCount={archivedTemplates}
                openShiftCount={totalStaffingGapSummary.missingShiftCount}
              />

              <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
                <ScheduleTemplateList
                  templates={templates}
                  loading={loading}
                  showArchived={showArchived}
                  selectedTemplateId={selectedTemplateId}
                  onShowArchivedChange={setShowArchived}
                  onSelectTemplate={(templateId) => setSelectedTemplateId(templateId)}
                  onCreateTemplate={() => {
                    setCreateTemplateForm(emptyTemplateForm);
                    setCreateTemplateModalOpen(true);
                  }}
                />

                <section className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  {!selectedTemplate && (
                    <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
                      Opret eller vælg en vagtsskabelon for at redigere ugedage
                      og jobfunktioner.
                    </p>
                  )}

                  {selectedTemplate && (
                    <div className="flex flex-col gap-5">
                      <ScheduleTemplateSelectedHeader
                        template={selectedTemplate}
                        form={templateForm}
                        setForm={setTemplateForm}
                        editing={editingTemplate}
                        saving={savingTemplate}
                        copying={copyingTemplate}
                        gapSummary={selectedTemplateGapSummary}
                        gaps={selectedTemplateGaps}
                        weekdays={weekdayOptions}
                        onArchive={() => archiveTemplate(selectedTemplate)}
                        onReactivate={() => reactivateTemplate(selectedTemplate)}
                        onCopyTemplate={openCopyTemplateModal}
                        onToggleEditing={() =>
                          setEditingTemplate((current) => !current)
                        }
                        onSave={updateTemplate}
                      />

                      <ScheduleTemplateWeekdayTabs
                        template={selectedTemplate}
                        weekdays={weekdayOptions}
                        selectedWeekday={selectedWeekday}
                        onSelectWeekday={setSelectedWeekday}
                      />

                      <ScheduleTemplateDaySettings
                        weekdayLabel={formatWeekday(selectedWeekday)}
                        hasSelectedDay={Boolean(selectedDay)}
                        form={dayForm}
                        setForm={setDayForm}
                        gapSummary={selectedDayGapSummary}
                        saving={savingDay}
                        copying={copyingDay}
                        onSave={saveSelectedDay}
                        onCopyDay={openCopyDayModal}
                      />

                      <ScheduleTemplateJobFunctionsSection
                        weekdayLabel={formatWeekday(selectedWeekday)}
                        selectedDay={selectedDay}
                        jobFunctions={jobFunctions}
                        employees={employees}
                        form={jobFunctionForm}
                        setForm={setJobFunctionForm}
                        savingJobFunction={savingJobFunction}
                        expandedJobFunctionIds={expandedJobFunctionIds}
                        savingAssignmentKey={savingAssignmentKey}
                        onAddJobFunction={addJobFunction}
                        onToggleJobFunctionDetails={toggleJobFunctionDetails}
                        onRemoveTemplateJobFunction={removeTemplateJobFunction}
                        onAddTemplateAssignment={addTemplateAssignment}
                        onRemoveTemplateAssignment={removeTemplateAssignment}
                        onUpdateTemplateJobFunction={updateTemplateJobFunction}
                      />
                    </div>
                  )}
                </section>
              </section>
            </>
          )}
        </div>

        {createTemplateModalOpen && (
          <ScheduleTemplateCreateModal
            form={createTemplateForm}
            setForm={setCreateTemplateForm}
            saving={savingTemplate}
            onClose={() => setCreateTemplateModalOpen(false)}
            onSubmit={createTemplate}
          />
        )}

        {copyTemplateModalOpen && selectedTemplate && (
          <ScheduleTemplateCopyModal
            sourceTemplate={selectedTemplate}
            copyName={copyTemplateName}
            setCopyName={setCopyTemplateName}
            includeAssignments={copyTemplateIncludeAssignments}
            setIncludeAssignments={setCopyTemplateIncludeAssignments}
            includeInactiveDays={copyTemplateIncludeInactiveDays}
            setIncludeInactiveDays={setCopyTemplateIncludeInactiveDays}
            includeNotes={copyTemplateIncludeNotes}
            setIncludeNotes={setCopyTemplateIncludeNotes}
            inactiveDayCount={selectedTemplateInactiveDayCount}
            staffingSummary={selectedTemplateStaffingSummary}
            copiedOpenShiftCount={copiedTemplateOpenShiftCount}
            daySummaries={selectedTemplateCopyDaySummaries}
            nameIsBlank={copyTemplateNameIsBlank}
            nameExists={copyTemplateNameExists}
            hasNoDays={copyTemplateHasNoDays}
            copying={copyingTemplate}
            onClose={() => setCopyTemplateModalOpen(false)}
            onSubmit={copySelectedTemplate}
          />
        )}

        {copyDayModalOpen && (
          <ScheduleTemplateCopyDayModal
            sourceWeekday={selectedWeekday}
            targetOptions={copyDayTargetOptions}
            selectedTargets={copyDayTargets}
            selectedDayGapSummary={selectedDayGapSummary}
            selectedDayStaffingSummary={selectedDayStaffingSummary}
            copying={copyingDay}
            onClose={() => setCopyDayModalOpen(false)}
            onToggleTarget={toggleCopyDayTarget}
            onSelectTargets={selectCopyDayTargets}
            onClearTargets={() => setCopyDayTargets([])}
            onSubmit={copySelectedDayToTargets}
          />
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
