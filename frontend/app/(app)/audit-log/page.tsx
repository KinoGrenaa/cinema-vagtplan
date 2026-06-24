"use client";

import { useEffect, useMemo, useState } from "react";

import PermissionGuard from "@/app/components/PermissionGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

import AuditLogFilters from "./components/AuditLogFilters";
import AuditLogListSection from "./components/AuditLogListSection";
import {
  getActionLabel,
  getEntityTypeLabel,
  getPerformedBy,
  getSubjectName,
  groupLogsByDate,
  readErrorMessage,
} from "./helpers/auditLogHelpers";
import type { AuditLog } from "./helpers/auditLogTypes";

export default function AuditLogPage() {
  const { isMaster, user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);
  const errorDialog = useInfoModal();

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedMasterCinema() {
      setSelectedMasterCinemaId(
        window.localStorage.getItem("masterSelectedCinemaId"),
      );
    }

    updateSelectedMasterCinema();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinema,
    );
    window.addEventListener("storage", updateSelectedMasterCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinema,
      );
      window.removeEventListener("storage", updateSelectedMasterCinema);
    };
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedMasterCinemaId, user?.role, user?.cinemaId]);

  async function fetchLogs() {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    if (needsMasterCinemaSelection) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        user.role === "MASTER" && !user.cinemaId && selectedMasterCinemaId
          ? `/audit-logs?cinemaId=${encodeURIComponent(selectedMasterCinemaId)}`
          : "/audit-logs";

      const response = await apiFetch(endpoint);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente ændringshistorik.",
          ),
        );
      }

      const data = await response.json();

      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      errorDialog.showError(
        "Kunne ikke hente ændringshistorik",
        error instanceof Error
          ? error.message
          : "Der opstod en uventet fejl under hentning af ændringshistorikken.",
      );
    } finally {
      setLoading(false);
    }
  }

  const entityTypes = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entityType))).sort();
  }, [logs]);

  const visibleLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      if (entityFilter !== "ALL" && log.entityType !== entityFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        log.action,
        getActionLabel(log.action),
        log.entityType,
        getEntityTypeLabel(log.entityType),
        log.entityId?.toString(),
        log.description,
        getSubjectName(log),
        getPerformedBy(log),
        log.user?.email,
        log.subjectUser?.email,
        isMaster ? log.cinema?.name : undefined,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [logs, search, entityFilter, isMaster]);

  const groupedLogs = useMemo(() => {
    return groupLogsByDate(visibleLogs);
  }, [visibleLogs]);

  useEffect(() => {
    setExpandedDateKeys((current) => {
      const validKeys = groupedLogs.map((group) => group.dateKey);

      if (validKeys.length === 0) {
        return [];
      }

      const currentValidKeys = current.filter((dateKey) =>
        validKeys.includes(dateKey),
      );
      const latestDateKey = validKeys[0];
      const nextKeys = currentValidKeys.includes(latestDateKey)
        ? currentValidKeys
        : [latestDateKey, ...currentValidKeys];

      const isUnchanged =
        nextKeys.length === current.length &&
        nextKeys.every((dateKey, index) => dateKey === current[index]);

      return isUnchanged ? current : nextKeys;
    });
  }, [groupedLogs]);

  function toggleDateGroup(dateKey: string) {
    setExpandedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((currentDateKey) => currentDateKey !== dateKey)
        : [dateKey, ...current],
    );
  }

  if (loading) {
    return (
      <PermissionGuard permission="canManageUsers">
        <>
          <div className="min-h-screen bg-gray-50 p-6 text-gray-600 dark:bg-gray-950 dark:text-gray-300">
            Indlæser ændringshistorik...
          </div>

          <InfoModal
            open={errorDialog.open}
            title={errorDialog.title}
            description={errorDialog.description}
            buttonText={errorDialog.buttonText}
            variant={errorDialog.variant}
            onClose={errorDialog.close}
          />
        </>
      </PermissionGuard>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <PermissionGuard permission="canManageUsers">
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
            <h1 className="text-xl font-bold text-amber-950 dark:text-amber-100">
              Ingen aktiv biograf valgt
            </h1>
            <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/80">
              Vælg en biograf i MASTER-panelet, før du kan se ændringshistorik.
            </p>
          </section>

          <InfoModal
            open={errorDialog.open}
            title={errorDialog.title}
            description={errorDialog.description}
            buttonText={errorDialog.buttonText}
            variant={errorDialog.variant}
            onClose={errorDialog.close}
          />
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManageUsers">
      <div className="min-h-screen bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Ændringshistorik
          </h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Overblik over administrative handlinger og vigtige ændringer i
            systemet.
          </p>
        </div>

        <AuditLogFilters
          search={search}
          setSearch={setSearch}
          entityFilter={entityFilter}
          setEntityFilter={setEntityFilter}
          entityTypes={entityTypes}
        />

        <AuditLogListSection
          logs={logs}
          visibleLogs={visibleLogs}
          groupedLogs={groupedLogs}
          expandedDateKeys={expandedDateKeys}
          isMaster={isMaster}
          toggleDateGroup={toggleDateGroup}
        />

        <InfoModal
          open={errorDialog.open}
          title={errorDialog.title}
          description={errorDialog.description}
          buttonText={errorDialog.buttonText}
          variant={errorDialog.variant}
          onClose={errorDialog.close}
        />
      </div>
    </PermissionGuard>
  );
}
