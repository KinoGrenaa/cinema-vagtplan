import { useCallback, useEffect, useRef, useState } from "react";

import { fetchScheduleTemplatePageData } from "../../helpers/api/scheduleTemplateDataApi";

import type {
  CurrentUser,
  JobFunction,
  ScheduleTemplate,
  ScheduleTemplateUser,
} from "../../helpers/page/scheduleTemplatePageTypes";

type InfoDialogLike = {
  showError: (title: string, description: string) => void;
};

type UseScheduleTemplateDataArgs = {
  currentUser: CurrentUser | null;
  activeCinemaId: number | null;
  needsMasterCinemaSelection: boolean;
  infoDialog: InfoDialogLike;
};

export function useScheduleTemplateData({
  currentUser,
  activeCinemaId,
  needsMasterCinemaSelection,
  infoDialog,
}: UseScheduleTemplateDataArgs) {
  const infoDialogRef = useRef(infoDialog);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [employees, setEmployees] = useState<ScheduleTemplateUser[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    infoDialogRef.current = infoDialog;
  }, [infoDialog]);

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

  return {
    templates,
    jobFunctions,
    employees,
    selectedTemplateId,
    setSelectedTemplateId,
    showArchived,
    setShowArchived,
    loading,
    fetchData,
  };
}
