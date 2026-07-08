import { useEffect, useState } from "react";

import {
  emptyJobFunctionForm,
  emptyTemplateForm,
  toDayForm,
  toTemplateForm,
} from "../helpers/scheduleTemplateFormHelpers";

import type { ScheduleTemplate } from "../helpers/scheduleTemplatePageTypes";
import { useScheduleTemplateDerivedState } from "./useScheduleTemplateDerivedState";

export function useScheduleTemplatePageState({
  templates,
  selectedTemplateId,
}: {
  templates: ScheduleTemplate[];
  selectedTemplateId: number | null;
}) {
  const [selectedWeekday, setSelectedWeekday] = useState(1);
  const [createTemplateForm, setCreateTemplateForm] =
    useState(emptyTemplateForm);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [dayForm, setDayForm] = useState(toDayForm(null));
  const [jobFunctionForm, setJobFunctionForm] = useState(emptyJobFunctionForm);
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

  const derivedState = useScheduleTemplateDerivedState({
    templates,
    selectedTemplateId,
    selectedWeekday,
    copyTemplateName,
    copyTemplateIncludeAssignments,
    copyTemplateIncludeInactiveDays,
  });

  useEffect(() => {
    setTemplateForm(
      derivedState.selectedTemplate
        ? toTemplateForm(derivedState.selectedTemplate)
        : emptyTemplateForm,
    );
    setEditingTemplate(false);
    setCopyTemplateModalOpen(false);
    setCopyTemplateName("");
  }, [derivedState.selectedTemplate]);

  useEffect(() => {
    setDayForm(toDayForm(derivedState.selectedDay));
    setJobFunctionForm(emptyJobFunctionForm);
    setExpandedJobFunctionIds(new Set());
    setCopyDayModalOpen(false);
    setCopyDayTargets([]);
  }, [derivedState.selectedDay, selectedWeekday]);

  const openCreateTemplateModal = () => {
    setCreateTemplateForm(emptyTemplateForm);
    setCreateTemplateModalOpen(true);
  };

  return {
    ...derivedState,
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
  };
}
