"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import ScheduleTemplateCopyDayModal from "./components/ScheduleTemplateCopyDayModal";
import ScheduleTemplateCopyModal from "./components/ScheduleTemplateCopyModal";
import ScheduleTemplateCreateModal from "./components/ScheduleTemplateCreateModal";
import ScheduleTemplateList from "./components/ScheduleTemplateList";
import ScheduleTemplateEditorPanel from "./components/ScheduleTemplateEditorPanel";
import ScheduleTemplatesMasterCinemaRequired from "./components/ScheduleTemplatesMasterCinemaRequired";
import ScheduleTemplatesPageIntro from "./components/ScheduleTemplatesPageIntro";
import ScheduleTemplateSummaryCards from "./components/ScheduleTemplateSummaryCards";

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
  formatWeekday,
  getAssignmentUserId,
  getCopyTargetWeekdays,
  getCurrentUserFromToken,
  getSelectedMasterCinemaId,
  getTemplateDay,
  weekdayOptions,
} from "./helpers/scheduleTemplatePageHelpers";
import {
  emptyJobFunctionForm,
  emptyTemplateForm,
  toDayForm,
  toTemplateForm,
} from "./helpers/scheduleTemplateFormHelpers";
import { copyScheduleTemplateDayToTargets } from "./helpers/scheduleTemplateCopyDayApi";
import {
  addScheduleTemplateAssignmentRequest,
  addScheduleTemplateJobFunctionRequest,
  removeScheduleTemplateAssignmentRequest,
  removeScheduleTemplateJobFunctionRequest,
  updateScheduleTemplateJobFunctionRequest,
} from "./helpers/scheduleTemplateJobFunctionApi";
import {
  archiveScheduleTemplateRequest,
  createScheduleTemplateRequest,
  reactivateScheduleTemplateRequest,
  saveScheduleTemplateDayRequest,
  updateScheduleTemplateRequest,
} from "./helpers/scheduleTemplateCrudApi";
import { fetchScheduleTemplatePageData } from "./helpers/scheduleTemplateDataApi";

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

      const nextData = await fetchScheduleTemplatePageData({
        activeCinemaId,
        showArchived,
      });

      setTemplates(nextData.templates);
      setJobFunctions(nextData.jobFunctions);
      setEmployees(nextData.employees);
      setSelectedTemplateId((current) => {
        if (
          current &&
          nextData.templates.some((template) => template.id === current)
        ) {
          return current;
        }

        return nextData.templates[0]?.id ?? null;
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
      const createdTemplate = await createScheduleTemplateRequest({
        form: createTemplateForm,
        activeCinemaId,
      });

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
      await updateScheduleTemplateRequest({
        templateId: selectedTemplate.id,
        form: templateForm,
        activeCinemaId,
      });

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
      await archiveScheduleTemplateRequest({
        templateId: template.id,
        activeCinemaId,
      });

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
      await reactivateScheduleTemplateRequest({
        templateId: template.id,
        activeCinemaId,
      });

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
      await saveScheduleTemplateDayRequest({
        templateId: selectedTemplate.id,
        weekday: selectedWeekday,
        form: dayForm,
        activeCinemaId,
      });

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
      await addScheduleTemplateJobFunctionRequest({
        templateId: selectedTemplate.id,
        weekday: selectedWeekday,
        form: jobFunctionForm,
        activeCinemaId,
      });

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
      await updateScheduleTemplateJobFunctionRequest({
        templateId: selectedTemplate.id,
        item,
        updates,
        activeCinemaId,
      });

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
      await removeScheduleTemplateJobFunctionRequest({
        templateId: selectedTemplate.id,
        itemId: item.id,
        activeCinemaId,
      });

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
      await addScheduleTemplateAssignmentRequest({
        templateId: selectedTemplate.id,
        item,
        userId,
        activeCinemaId,
      });

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
      await removeScheduleTemplateAssignmentRequest({
        templateId: selectedTemplate.id,
        item,
        assignment,
        activeCinemaId,
      });

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
      await copyScheduleTemplateDayToTargets({
        selectedTemplate,
        selectedDay,
        targetWeekdays: copyDayTargets,
        activeCinemaId,
      });

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
          <ScheduleTemplatesPageIntro />

          {needsMasterCinemaSelection && <ScheduleTemplatesMasterCinemaRequired />}

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

                <ScheduleTemplateEditorPanel
                  selectedTemplate={selectedTemplate}
                  templateForm={templateForm}
                  setTemplateForm={setTemplateForm}
                  editingTemplate={editingTemplate}
                  savingTemplate={savingTemplate}
                  copyingTemplate={copyingTemplate}
                  selectedTemplateGapSummary={selectedTemplateGapSummary}
                  selectedTemplateGaps={selectedTemplateGaps}
                  selectedWeekday={selectedWeekday}
                  onSelectWeekday={setSelectedWeekday}
                  selectedDay={selectedDay}
                  dayForm={dayForm}
                  setDayForm={setDayForm}
                  selectedDayGapSummary={selectedDayGapSummary}
                  savingDay={savingDay}
                  copyingDay={copyingDay}
                  jobFunctions={jobFunctions}
                  employees={employees}
                  jobFunctionForm={jobFunctionForm}
                  setJobFunctionForm={setJobFunctionForm}
                  savingJobFunction={savingJobFunction}
                  expandedJobFunctionIds={expandedJobFunctionIds}
                  savingAssignmentKey={savingAssignmentKey}
                  onArchiveSelectedTemplate={() => {
                    if (selectedTemplate) archiveTemplate(selectedTemplate);
                  }}
                  onReactivateSelectedTemplate={() => {
                    if (selectedTemplate) reactivateTemplate(selectedTemplate);
                  }}
                  onCopyTemplate={openCopyTemplateModal}
                  onToggleEditing={() => setEditingTemplate((current) => !current)}
                  onSaveTemplate={updateTemplate}
                  onSaveDay={saveSelectedDay}
                  onCopyDay={openCopyDayModal}
                  onAddJobFunction={addJobFunction}
                  onToggleJobFunctionDetails={toggleJobFunctionDetails}
                  onRemoveTemplateJobFunction={removeTemplateJobFunction}
                  onAddTemplateAssignment={addTemplateAssignment}
                  onRemoveTemplateAssignment={removeTemplateAssignment}
                  onUpdateTemplateJobFunction={updateTemplateJobFunction}
                />
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
