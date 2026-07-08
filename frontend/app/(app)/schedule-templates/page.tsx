"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import ScheduleTemplateList from "./components/ScheduleTemplateList";
import ScheduleTemplateModals from "./components/ScheduleTemplateModals";
import ScheduleTemplateEditorPanel from "./components/ScheduleTemplateEditorPanel";
import ScheduleTemplatesMasterCinemaRequired from "./components/ScheduleTemplatesMasterCinemaRequired";
import ScheduleTemplatesPageIntro from "./components/ScheduleTemplatesPageIntro";
import ScheduleTemplateSummaryCards from "./components/ScheduleTemplateSummaryCards";

import {
  emptyJobFunctionForm,
  emptyTemplateForm,
  toDayForm,
  toTemplateForm,
} from "./helpers/scheduleTemplateFormHelpers";
import { fetchScheduleTemplatePageData } from "./helpers/scheduleTemplateDataApi";

import type {
  JobFunction,
  ScheduleTemplate,
  ScheduleTemplateUser,
} from "./helpers/scheduleTemplatePageTypes";
import { useScheduleTemplateDerivedState } from "./hooks/useScheduleTemplateDerivedState";
import { useScheduleTemplateMasterCinema } from "./hooks/useScheduleTemplateMasterCinema";
import { useScheduleTemplateCopyActions } from "./hooks/useScheduleTemplateCopyActions";
import { useScheduleTemplateCrudActions } from "./hooks/useScheduleTemplateCrudActions";
import { useScheduleTemplateJobFunctionActions } from "./hooks/useScheduleTemplateJobFunctionActions";


export default function ScheduleTemplatesPage() {
  const infoDialog = useInfoModal();
  const infoDialogRef = useRef(infoDialog);
  const { currentUser, activeCinemaId, needsMasterCinemaSelection } =
    useScheduleTemplateMasterCinema();
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

  const {
    selectedTemplate,
    selectedDay,
    selectedTemplateGaps,
    selectedTemplateGapSummary,
    selectedDayGapSummary,
    selectedDayStaffingSummary,
    copyDayTargetOptions,
    selectedTemplateInactiveDayCount,
    selectedTemplateStaffingSummary,
    copiedTemplateOpenShiftCount,
    selectedTemplateCopyDaySummaries,
    copyTemplateNameExists,
    copyTemplateNameIsBlank,
    copyTemplateHasNoDays,
    activeTemplates,
    archivedTemplates,
    totalStaffingGapSummary,
  } = useScheduleTemplateDerivedState({
    templates,
    selectedTemplateId,
    selectedWeekday,
    copyTemplateName,
    copyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays,
  });

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

  const { createTemplate, updateTemplate, archiveTemplate, reactivateTemplate, saveSelectedDay } =
    useScheduleTemplateCrudActions({
      infoDialog,
      needsMasterCinemaSelection,
      activeCinemaId,
      selectedTemplate,
      selectedWeekday,
      createTemplateForm,
      templateForm,
      dayForm,
      fetchData,
      setSavingTemplate,
      setSavingDay,
      setSelectedTemplateId,
      setCreateTemplateForm,
      setCreateTemplateModalOpen,
      setEditingTemplate,
    });

  const {
    addJobFunction,
    updateTemplateJobFunction,
    removeTemplateJobFunction,
    addTemplateAssignment,
    removeTemplateAssignment,
    toggleJobFunctionDetails,
  } = useScheduleTemplateJobFunctionActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    selectedWeekday,
    jobFunctionForm,
    fetchData,
    setSavingJobFunction,
    setJobFunctionForm,
    setSavingAssignmentKey,
    setExpandedJobFunctionIds,
  });

  const {
    openCopyTemplateModal,
    copySelectedTemplate,
    openCopyDayModal,
    toggleCopyDayTarget,
    selectCopyDayTargets,
    copySelectedDayToTargets,
  } = useScheduleTemplateCopyActions({
    infoDialog,
    activeCinemaId,
    selectedTemplate,
    selectedDay,
    selectedWeekday,
    templates,
    copyTemplateName,
    copyTemplateNameExists,
    copyTemplateHasNoDays,
    copyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays,
    copyTemplateIncludeNotes,
    copyDayTargets,
    fetchData,
    setCopyTemplateName,
    setCopyTemplateIncludeAssignments,
    setCopyTemplateIncludeInactiveDays,
    setCopyTemplateIncludeNotes,
    setCopyTemplateModalOpen,
    setCopyingTemplate,
    setSelectedTemplateId,
    setSelectedWeekday,
    setCopyDayTargets,
    setCopyDayModalOpen,
    setCopyingDay,
  });

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

        <ScheduleTemplateModals
          createTemplateModalOpen={createTemplateModalOpen}
          createTemplateModalProps={{
            form: createTemplateForm,
            setForm: setCreateTemplateForm,
            saving: savingTemplate,
            onClose: () => setCreateTemplateModalOpen(false),
            onSubmit: createTemplate,
          }}
          copyTemplateModalOpen={copyTemplateModalOpen}
          copyTemplateModalProps={selectedTemplate
            ? {
                sourceTemplate: selectedTemplate,
                copyName: copyTemplateName,
                setCopyName: setCopyTemplateName,
                includeAssignments: copyTemplateIncludeAssignments,
                setIncludeAssignments: setCopyTemplateIncludeAssignments,
                includeInactiveDays: copyTemplateIncludeInactiveDays,
                setIncludeInactiveDays: setCopyTemplateIncludeInactiveDays,
                includeNotes: copyTemplateIncludeNotes,
                setIncludeNotes: setCopyTemplateIncludeNotes,
                inactiveDayCount: selectedTemplateInactiveDayCount,
                staffingSummary: selectedTemplateStaffingSummary,
                copiedOpenShiftCount: copiedTemplateOpenShiftCount,
                daySummaries: selectedTemplateCopyDaySummaries,
                nameIsBlank: copyTemplateNameIsBlank,
                nameExists: copyTemplateNameExists,
                hasNoDays: copyTemplateHasNoDays,
                copying: copyingTemplate,
                onClose: () => setCopyTemplateModalOpen(false),
                onSubmit: copySelectedTemplate,
              }
            : null}
          copyDayModalOpen={copyDayModalOpen}
          copyDayModalProps={{
            sourceWeekday: selectedWeekday,
            targetOptions: copyDayTargetOptions,
            selectedTargets: copyDayTargets,
            selectedDayGapSummary,
            selectedDayStaffingSummary,
            copying: copyingDay,
            onClose: () => setCopyDayModalOpen(false),
            onToggleTarget: toggleCopyDayTarget,
            onSelectTargets: selectCopyDayTargets,
            onClearTargets: () => setCopyDayTargets([]),
            onSubmit: copySelectedDayToTargets,
          }}
          infoModalProps={{
            open: infoDialog.open,
            title: infoDialog.title,
            description: infoDialog.description,
            buttonText: infoDialog.buttonText,
            variant: infoDialog.variant,
            onClose: infoDialog.close,
          }}
        />
      </main>
    </AdminGuard>
  );
}
