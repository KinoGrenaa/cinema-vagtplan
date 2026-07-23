"use client";

import AdminGuard from "@/app/components/access/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import LeaveApprovalHeader from "./components/layout/LeaveApprovalHeader";
import LeaveApprovalRequestsSection from "./components/list/LeaveApprovalRequestsSection";
import LeaveApprovalFilterModal from "./components/modals/LeaveApprovalFilterModal";
import LeaveApprovalSummaryCards from "./components/overview/LeaveApprovalSummaryCards";
import { makeDateGroupExpansionKey } from "./helpers/core/leaveApprovalHelpers";
import { useLeaveApprovalData } from "./hooks/data/useLeaveApprovalData";
import { useLeaveApprovalFilters } from "./hooks/filters/useLeaveApprovalFilters";

export default function LeaveApprovalPage() {
  const infoDialog = useInfoModal();

  const {
    requests,
    loading,
    needsMasterCinemaSelection,
    updateStatus,
  } = useLeaveApprovalData(
    infoDialog,
  );

  const {
    showFilterModal,
    draftStatusFilters,
    draftStartDateFilter,
    draftEndDateFilter,
    expandedUserIds,
    expandedDateGroupKeys,
    visibleRequests,
    groupedRequests,
    dateRangeStatusCounts,
    activeFilterCount,
    hasCustomFilters,
    statusFilterSummary,
    dateFilterSummary,
    openFilterModal,
    closeFilterModal,
    updateDraftStatusFilter,
    setDraftStartDateFilter,
    setDraftEndDateFilter,
    applyFilter,
    resetFilter,
    showOnlyPending,
    toggleUserGroup,
    toggleDateGroup,
  } = useLeaveApprovalFilters(
    requests,
  );

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <LeaveApprovalHeader
            statusFilterSummary={
              statusFilterSummary
            }
            dateFilterSummary={
              dateFilterSummary
            }
            pendingCount={
              dateRangeStatusCounts.PENDING
            }
            activeFilterCount={
              activeFilterCount
            }
            hasCustomFilters={
              hasCustomFilters
            }
            onShowOnlyPending={
              showOnlyPending
            }
            onOpenFilterModal={
              openFilterModal
            }
            onResetFilter={
              resetFilter
            }
          />

          {needsMasterCinemaSelection && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
              <h2 className="text-lg font-semibold">
                Ingen aktiv biograf valgt
              </h2>

              <p className="mt-2 text-sm text-amber-900 dark:text-amber-100/90">
                Vælg en biograf i
                MASTER-panelet, før du
                kan se eller behandle
                fravær.
              </p>
            </section>
          )}

          {!needsMasterCinemaSelection &&
            !loading && (
              <LeaveApprovalSummaryCards
                statusCounts={
                  dateRangeStatusCounts
                }
              />
            )}

          {loading && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
              Henter
              fraværsansøgninger...
            </section>
          )}

          {!needsMasterCinemaSelection &&
            !loading && (
              <LeaveApprovalRequestsSection
                requests={requests}
                visibleRequests={
                  visibleRequests
                }
                groupedRequests={
                  groupedRequests
                }
                statusFilterSummary={
                  statusFilterSummary
                }
                dateFilterSummary={
                  dateFilterSummary
                }
                expandedUserIds={
                  expandedUserIds
                }
                isDateGroupExpanded={(
                  userId,
                  dateKey,
                ) =>
                  expandedDateGroupKeys.includes(
                    makeDateGroupExpansionKey(
                      userId,
                      dateKey,
                    ),
                  )
                }
                onToggleUserGroup={
                  toggleUserGroup
                }
                onToggleDateGroup={
                  toggleDateGroup
                }
                onUpdateStatus={
                  updateStatus
                }
              />
            )}
        </div>

        <LeaveApprovalFilterModal
          open={showFilterModal}
          activeFilterCount={
            activeFilterCount
          }
          draftStatusFilters={
            draftStatusFilters
          }
          draftStartDateFilter={
            draftStartDateFilter
          }
          draftEndDateFilter={
            draftEndDateFilter
          }
          onStatusFilterChange={
            updateDraftStatusFilter
          }
          onStartDateFilterChange={
            setDraftStartDateFilter
          }
          onEndDateFilterChange={
            setDraftEndDateFilter
          }
          onApply={applyFilter}
          onReset={resetFilter}
          onClose={closeFilterModal}
        />

        <InfoModal
          open={infoDialog.open}
          title={infoDialog.title}
          description={
            infoDialog.description
          }
          buttonText={
            infoDialog.buttonText
          }
          variant={
            infoDialog.variant
          }
          onClose={infoDialog.close}
        />
      </main>
    </AdminGuard>
  );
}
