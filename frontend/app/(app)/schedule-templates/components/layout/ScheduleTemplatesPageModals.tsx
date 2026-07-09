import ScheduleTemplateModals from "../modals/ScheduleTemplateModals";

import type { ScheduleTemplatePageController } from "../../hooks/controllers/useScheduleTemplatePageController";

type ScheduleTemplatesPageModalsProps = {
  controller: ScheduleTemplatePageController;
};

export default function ScheduleTemplatesPageModals({
  controller,
}: ScheduleTemplatesPageModalsProps) {
  return (
    <ScheduleTemplateModals
      createTemplateModalOpen={controller.createTemplateModalOpen}
      createTemplateModalProps={{
        form: controller.createTemplateForm,
        setForm: controller.setCreateTemplateForm,
        saving: controller.savingTemplate,
        onClose: () => controller.setCreateTemplateModalOpen(false),
        onSubmit: controller.createTemplate,
      }}
      copyTemplateModalOpen={controller.copyTemplateModalOpen}
      copyTemplateModalProps={controller.selectedTemplate
        ? {
            sourceTemplate: controller.selectedTemplate,
            copyName: controller.copyTemplateName,
            setCopyName: controller.setCopyTemplateName,
            includeAssignments: controller.copyTemplateIncludeAssignments,
            setIncludeAssignments: controller.setCopyTemplateIncludeAssignments,
            includeInactiveDays: controller.copyTemplateIncludeInactiveDays,
            setIncludeInactiveDays:
              controller.setCopyTemplateIncludeInactiveDays,
            includeNotes: controller.copyTemplateIncludeNotes,
            setIncludeNotes: controller.setCopyTemplateIncludeNotes,
            inactiveDayCount: controller.selectedTemplateInactiveDayCount,
            staffingSummary: controller.selectedTemplateStaffingSummary,
            copiedOpenShiftCount: controller.copiedTemplateOpenShiftCount,
            daySummaries: controller.selectedTemplateCopyDaySummaries,
            nameIsBlank: controller.copyTemplateNameIsBlank,
            nameExists: controller.copyTemplateNameExists,
            hasNoDays: controller.copyTemplateHasNoDays,
            copying: controller.copyingTemplate,
            onClose: () => controller.setCopyTemplateModalOpen(false),
            onSubmit: controller.copySelectedTemplate,
          }
        : null}
      copyDayModalOpen={controller.copyDayModalOpen}
      copyDayModalProps={{
        sourceWeekday: controller.selectedWeekday,
        targetOptions: controller.copyDayTargetOptions,
        selectedTargets: controller.copyDayTargets,
        selectedDayGapSummary: controller.selectedDayGapSummary,
        selectedDayStaffingSummary: controller.selectedDayStaffingSummary,
        copying: controller.copyingDay,
        onClose: () => controller.setCopyDayModalOpen(false),
        onToggleTarget: controller.toggleCopyDayTarget,
        onSelectTargets: controller.selectCopyDayTargets,
        onClearTargets: () => controller.setCopyDayTargets([]),
        onSubmit: controller.copySelectedDayToTargets,
      }}
      infoModalProps={{
        open: controller.infoDialog.open,
        title: controller.infoDialog.title,
        description: controller.infoDialog.description,
        buttonText: controller.infoDialog.buttonText,
        variant: controller.infoDialog.variant,
        onClose: controller.infoDialog.close,
      }}
    />
  );
}
