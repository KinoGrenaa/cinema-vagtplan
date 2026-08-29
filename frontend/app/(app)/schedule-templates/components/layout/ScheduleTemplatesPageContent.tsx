import ScheduleTemplateEditorPanel from "../editor/ScheduleTemplateEditorPanel";
import ScheduleTemplateList from "../overview/ScheduleTemplateList";
import ScheduleTemplatesMasterCinemaRequired from "./ScheduleTemplatesMasterCinemaRequired";
import ScheduleTemplatesPageIntro from "./ScheduleTemplatesPageIntro";
import ScheduleTemplateSummaryCards from "../overview/ScheduleTemplateSummaryCards";

import type { ScheduleTemplatePageController } from "../../hooks/controllers/useScheduleTemplatePageController";

type ScheduleTemplatesPageContentProps = {
  controller: ScheduleTemplatePageController;
};

export default function ScheduleTemplatesPageContent({
  controller,
}: ScheduleTemplatesPageContentProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <ScheduleTemplatesPageIntro />

      {controller.needsMasterCinemaSelection && (
        <ScheduleTemplatesMasterCinemaRequired />
      )}

      {!controller.needsMasterCinemaSelection && (
        <>
          <ScheduleTemplateSummaryCards
            totalCount={controller.templates.length}
            activeCount={controller.activeTemplates}
            archivedCount={controller.archivedTemplates}
            openShiftCount={controller.totalStaffingGapSummary.missingShiftCount}
          />

          <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <ScheduleTemplateList
              templates={controller.templates}
              loading={controller.loading}
              showArchived={controller.showArchived}
              selectedTemplateId={controller.selectedTemplateId}
              onShowArchivedChange={controller.setShowArchived}
              onSelectTemplate={(templateId) =>
                controller.setSelectedTemplateId(templateId)
              }
              onCreateTemplate={controller.openCreateTemplateModal}
            />

            <ScheduleTemplateEditorPanel
              selectedTemplate={controller.selectedTemplate}
              templateForm={controller.templateForm}
              setTemplateForm={controller.setTemplateForm}
              editingTemplate={controller.editingTemplate}
              savingTemplate={controller.savingTemplate}
              copyingTemplate={controller.copyingTemplate}
              selectedTemplateGapSummary={controller.selectedTemplateGapSummary}
              selectedTemplateGaps={controller.selectedTemplateGaps}
              selectedWeekday={controller.selectedWeekday}
              onSelectWeekday={controller.setSelectedWeekday}
              selectedDay={controller.selectedDay}
              dayForm={controller.dayForm}
              setDayForm={controller.setDayForm}
              savingDay={controller.savingDay}
              copyingDay={controller.copyingDay}
              jobFunctions={controller.jobFunctions}
              employees={controller.employees}
              jobFunctionForm={controller.jobFunctionForm}
              setJobFunctionForm={controller.setJobFunctionForm}
              savingJobFunction={controller.savingJobFunction}
              expandedJobFunctionIds={controller.expandedJobFunctionIds}
              savingAssignmentKey={controller.savingAssignmentKey}
              onArchiveSelectedTemplate={() => {
                if (controller.selectedTemplate) {
                  controller.archiveTemplate(controller.selectedTemplate);
                }
              }}
              onReactivateSelectedTemplate={() => {
                if (controller.selectedTemplate) {
                  controller.reactivateTemplate(controller.selectedTemplate);
                }
              }}
              onCopyTemplate={controller.openCopyTemplateModal}
              onToggleEditing={() =>
                controller.setEditingTemplate((current) => !current)
              }
              onSaveTemplate={controller.updateTemplate}
              onSaveDay={controller.saveSelectedDay}
              onCopyDay={controller.openCopyDayModal}
              onAddJobFunction={controller.addJobFunction}
              onToggleJobFunctionDetails={controller.toggleJobFunctionDetails}
              onRemoveTemplateJobFunction={controller.removeTemplateJobFunction}
              onAddTemplateAssignment={controller.addTemplateAssignment}
              onRemoveTemplateAssignment={controller.removeTemplateAssignment}
              onUpdateTemplateJobFunction={controller.updateTemplateJobFunction}
            />
          </section>
        </>
      )}
    </div>
  );
}
