"use client";

import AdminGuard from "@/app/components/AdminGuard";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import ScheduleTemplateList from "./components/ScheduleTemplateList";
import ScheduleTemplateModals from "./components/ScheduleTemplateModals";
import ScheduleTemplateEditorPanel from "./components/ScheduleTemplateEditorPanel";
import ScheduleTemplatesMasterCinemaRequired from "./components/ScheduleTemplatesMasterCinemaRequired";
import ScheduleTemplatesPageIntro from "./components/ScheduleTemplatesPageIntro";
import ScheduleTemplateSummaryCards from "./components/ScheduleTemplateSummaryCards";

import { useScheduleTemplateMasterCinema } from "./hooks/useScheduleTemplateMasterCinema";
import { useScheduleTemplateCopyActions } from "./hooks/useScheduleTemplateCopyActions";
import { useScheduleTemplateCrudActions } from "./hooks/useScheduleTemplateCrudActions";
import { useScheduleTemplateJobFunctionActions } from "./hooks/useScheduleTemplateJobFunctionActions";
import { useScheduleTemplateData } from "./hooks/useScheduleTemplateData";
import { useScheduleTemplatePageState } from "./hooks/useScheduleTemplatePageState";

export default function ScheduleTemplatesPage() {
  const infoDialog = useInfoModal();
  const { currentUser, activeCinemaId, needsMasterCinemaSelection } =
    useScheduleTemplateMasterCinema();
  const {
    templates,
    jobFunctions,
    employees,
    selectedTemplateId,
    setSelectedTemplateId,
    showArchived,
    setShowArchived,
    loading,
    fetchData,
  } = useScheduleTemplateData({
    currentUser,
    activeCinemaId,
    needsMasterCinemaSelection,
    infoDialog,
  });
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
    selectedWeekday,
    setSelectedWeekday,
    createTemplateForm,
    setCreateTemplateForm,
    templateForm,
    setTemplateForm,
    dayForm,
    setDayForm,
    jobFunctionForm,
    setJobFunctionForm,
    savingTemplate,
    setSavingTemplate,
    savingDay,
    setSavingDay,
    savingJobFunction,
    setSavingJobFunction,
    copyingDay,
    setCopyingDay,
    copyingTemplate,
    setCopyingTemplate,
    savingAssignmentKey,
    setSavingAssignmentKey,
    editingTemplate,
    setEditingTemplate,
    createTemplateModalOpen,
    setCreateTemplateModalOpen,
    expandedJobFunctionIds,
    setExpandedJobFunctionIds,
    copyDayModalOpen,
    setCopyDayModalOpen,
    copyDayTargets,
    setCopyDayTargets,
    copyTemplateModalOpen,
    setCopyTemplateModalOpen,
    copyTemplateName,
    setCopyTemplateName,
    copyTemplateIncludeAssignments,
    setCopyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays,
    setCopyTemplateIncludeInactiveDays,
    copyTemplateIncludeNotes,
    setCopyTemplateIncludeNotes,
    openCreateTemplateModal,
  } = useScheduleTemplatePageState({
    templates,
    selectedTemplateId,
  });

  const {
    createTemplate,
    updateTemplate,
    archiveTemplate,
    reactivateTemplate,
    saveSelectedDay,
  } = useScheduleTemplateCrudActions({
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
                  onCreateTemplate={openCreateTemplateModal}
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
