import { useState } from "react";

import { emptyTemplateForm } from "../helpers/scheduleTemplateFormHelpers";

export function useScheduleTemplateModalState() {
  const [createTemplateForm, setCreateTemplateForm] =
    useState(emptyTemplateForm);
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);

  const [copyDayModalOpen, setCopyDayModalOpen] = useState(false);
  const [copyDayTargets, setCopyDayTargets] = useState<number[]>([]);

  const [copyTemplateModalOpen, setCopyTemplateModalOpen] = useState(false);
  const [copyTemplateName, setCopyTemplateName] = useState("");
  const [copyTemplateIncludeAssignments, setCopyTemplateIncludeAssignments] =
    useState(true);
  const [copyTemplateIncludeInactiveDays, setCopyTemplateIncludeInactiveDays] =
    useState(true);
  const [copyTemplateIncludeNotes, setCopyTemplateIncludeNotes] = useState(true);

  const openCreateTemplateModal = () => {
    setCreateTemplateForm(emptyTemplateForm);
    setCreateTemplateModalOpen(true);
  };

  return {
    createTemplateForm,
    setCreateTemplateForm,
    createTemplateModalOpen,
    setCreateTemplateModalOpen,
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
