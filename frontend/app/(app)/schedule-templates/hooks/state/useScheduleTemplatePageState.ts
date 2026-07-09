import { useEffect, useState } from "react";

import {
  emptyJobFunctionForm,
  emptyTemplateForm,
  toDayForm,
  toTemplateForm,
} from "../../helpers/page/scheduleTemplateFormHelpers";
import type { ScheduleTemplate } from "../../helpers/page/scheduleTemplatePageTypes";

import { useScheduleTemplateDerivedState } from "./useScheduleTemplateDerivedState";
import { useScheduleTemplateModalState } from "./useScheduleTemplateModalState";
import { useScheduleTemplateSavingState } from "./useScheduleTemplateSavingState";

export function useScheduleTemplatePageState({
  templates,
  selectedTemplateId,
}: {
  templates: ScheduleTemplate[];
  selectedTemplateId: number | null;
}) {
  const [selectedWeekday, setSelectedWeekday] = useState(1);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [dayForm, setDayForm] = useState(toDayForm(null));
  const [jobFunctionForm, setJobFunctionForm] = useState(emptyJobFunctionForm);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [expandedJobFunctionIds, setExpandedJobFunctionIds] = useState<
    Set<number>
  >(() => new Set());

  const savingState = useScheduleTemplateSavingState();
  const modalState = useScheduleTemplateModalState();

  const derivedState = useScheduleTemplateDerivedState({
    templates,
    selectedTemplateId,
    selectedWeekday,
    copyTemplateName: modalState.copyTemplateName,
    copyTemplateIncludeAssignments: modalState.copyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays:
      modalState.copyTemplateIncludeInactiveDays,
  });

  useEffect(() => {
    setTemplateForm(
      derivedState.selectedTemplate
        ? toTemplateForm(derivedState.selectedTemplate)
        : emptyTemplateForm,
    );
    setEditingTemplate(false);
    modalState.setCopyTemplateModalOpen(false);
    modalState.setCopyTemplateName("");
  }, [derivedState.selectedTemplate]);

  useEffect(() => {
    setDayForm(toDayForm(derivedState.selectedDay));
    setJobFunctionForm(emptyJobFunctionForm);
    setExpandedJobFunctionIds(new Set());
    modalState.setCopyDayModalOpen(false);
    modalState.setCopyDayTargets([]);
  }, [derivedState.selectedDay, selectedWeekday]);

  return {
    ...derivedState,
    selectedWeekday,
    setSelectedWeekday,
    templateForm,
    setTemplateForm,
    dayForm,
    setDayForm,
    jobFunctionForm,
    setJobFunctionForm,
    editingTemplate,
    setEditingTemplate,
    expandedJobFunctionIds,
    setExpandedJobFunctionIds,
    ...savingState,
    ...modalState,
  };
}
