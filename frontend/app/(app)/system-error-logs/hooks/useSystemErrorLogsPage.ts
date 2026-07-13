"use client";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useAuth } from "@/app/providers/AuthProvider";

import { useSystemErrorLogActions } from "./actions/useSystemErrorLogActions";
import { useSystemErrorLogsData } from "./data/useSystemErrorLogsData";

export function useSystemErrorLogsPage() {
  const { loading: authLoading, isMaster } = useAuth();
  const infoDialog = useInfoModal();
  const noteDialog = useInputModal();

  const {
    fetchLogs,
    fetchRetentionSummary,
    ...dataState
  } = useSystemErrorLogsData({
    authLoading,
    isMaster,
    showError: infoDialog.showError,
  });

  const actions = useSystemErrorLogActions({
    infoDialog,
    noteDialog,
    retentionSummary: dataState.retentionSummary,
    fetchLogs,
    fetchRetentionSummary,
  });

  return {
    authLoading,
    isMaster,
    infoDialog,
    noteDialog,
    ...dataState,
    fetchRetentionSummary,
    ...actions,
  };
}
