"use client";

import {
  useCallback,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import LeaveRequestTargetNotice from "@/app/components/leave/LeaveRequestTargetNotice";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  parseLeaveRequestTarget,
} from "@/app/helpers/leaveRequestTarget";

import LeaveRequestFormModal from "./components/form/LeaveRequestFormModal";
import LeaveRequestsHeader from "./components/layout/LeaveRequestsHeader";
import LeaveRequestsMasterNotice from "./components/layout/LeaveRequestsMasterNotice";
import LeaveRequestsSuccessMessage from "./components/layout/LeaveRequestsSuccessMessage";
import LeaveRequestsListSection from "./components/list/LeaveRequestsListSection";
import LeaveRequestsCancelModal from "./components/modals/LeaveRequestsCancelModal";
import LeaveRequestsFilterModal from "./components/modals/LeaveRequestsFilterModal";
import LeaveRequestsSummaryCards from "./components/overview/LeaveRequestsSummaryCards";
import {
  useLeaveRequestsPage,
} from "./hooks/page/useLeaveRequestsPage";

export default function LeaveRequestsPage() {
  const pathname =
    usePathname();
  const router =
    useRouter();
  const searchParams =
    useSearchParams();
  const requestTarget =
    parseLeaveRequestTarget(
      searchParams.get(
        "requestId",
      ),
    );

  const {
    cancel,
    currentUserId,
    employeeSelection,
    filters,
    form,
    infoDialog,
    isMasterWithoutOwnCinema,
    requests,
  } = useLeaveRequestsPage(
    requestTarget.requestId,
  );
  const targetState =
    requestTarget.invalid
      ? "invalid"
      : !requestTarget.requestId
        ? "idle"
        : requests.some(
              (request) =>
                request.id ===
                requestTarget.requestId,
            )
          ? "found"
          : "missing";

  const clearRequestTarget =
    useCallback(() => {
      const params =
        new URLSearchParams(
          searchParams.toString(),
        );

      params.delete(
        "requestId",
      );
      const query =
        params.toString();

      router.replace(
        query
          ? `${pathname}?${query}`
          : pathname,
        {
          scroll: false,
        },
      );
    }, [
      pathname,
      router,
      searchParams,
    ]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <LeaveRequestsHeader
          activeFilterCount={
            filters.activeFilterCount
          }
          isMasterWithoutOwnCinema={
            isMasterWithoutOwnCinema
          }
          onOpenRequestModal={
            form.openRequestModal
          }
          onOpenFilterModal={
            filters.openFilterModal
          }
        />
        <LeaveRequestsSuccessMessage
          success={
            form.success
          }
        />

        <LeaveRequestTargetNotice
          state={targetState}
          requestId={
            requestTarget.requestId
          }
          audience="employee"
          onClear={
            clearRequestTarget
          }
        />

        {isMasterWithoutOwnCinema && (
          <LeaveRequestsMasterNotice />
        )}

        <LeaveRequestsSummaryCards
          statusCounts={
            filters.statusCounts
          }
          onShowPendingOnly={
            filters.showPendingOnly
          }
        />

        <LeaveRequestsListSection
          currentUserId={
            currentUserId
          }
          focusedRequestId={
            requestTarget.requestId
          }
          expandedGroupKeys={
            filters.expandedGroupKeys
          }
          filterSummary={
            filters.filterSummary
          }
          groupedRequests={
            filters.groupedRequests
          }
          totalRequestCount={
            filters.dateFilteredRequestCount
          }
          visibleRequestCount={
            filters.visibleRequests
              .length
          }
          hasMore={
            filters.hasMore
          }
          loadingMore={
            filters.loadingMore
          }
          onLoadMore={
            filters.loadMore
          }
          onSelectCancelRequest={
            cancel.setRequestToCancel
          }
          onToggleGroup={
            filters.toggleGroup
          }
        />
      </div>

      <LeaveRequestFormModal
        allDay={
          form.allDay
        }
        canCreateForEmployees={
          employeeSelection.canCreateForEmployees
        }
        employeeOptions={
          employeeSelection.employeeOptions
        }
        endDate={
          form.endDate
        }
        endTime={
          form.endTime
        }
        loadingEmployeeOptions={
          employeeSelection.loadingEmployeeOptions
        }
        minDate={
          form.minDate
        }
        open={
          form.showRequestModal
        }
        reason={
          form.reason
        }
        selectedUserId={
          form.selectedUserId
        }
        startDate={
          form.startDate
        }
        startTime={
          form.startTime
        }
        onClose={() =>
          form.setShowRequestModal(
            false,
          )
        }
        onSetAllDay={
          form.setAllDay
        }
        onSetEndDate={
          form.setEndDate
        }
        onSetEndTime={
          form.setEndTime
        }
        onSetReason={
          form.setReason
        }
        onSetSelectedUserId={
          form.setSelectedUserId
        }
        onSetStartDate={
          form.setStartDate
        }
        onSetStartTime={
          form.setStartTime
        }
        onSubmit={
          form.createLeaveRequest
        }
      />

      <LeaveRequestsFilterModal
        activeFilterCount={
          filters.activeFilterCount
        }
        draftFilterEndDate={
          filters.draftFilterEndDate
        }
        draftFilterStartDate={
          filters.draftFilterStartDate
        }
        draftStatusFilters={
          filters.draftStatusFilters
        }
        open={
          filters.showFilterModal
        }
        onApply={
          filters.applyFilter
        }
        onClose={
          filters.closeFilterModal
        }
        onReset={
          filters.resetFilter
        }
        onSetDraftFilterEndDate={
          filters.setDraftFilterEndDate
        }
        onSetDraftFilterStartDate={
          filters.setDraftFilterStartDate
        }
        onUpdateDraftStatusFilter={
          filters.updateDraftStatusFilter
        }
      />

      <LeaveRequestsCancelModal
        requestToCancel={
          cancel.requestToCancel
        }
        onClose={() =>
          cancel.setRequestToCancel(
            null,
          )
        }
        onConfirm={
          cancel.cancelLeaveRequest
        }
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
        onClose={
          infoDialog.close
        }
      />
    </main>
  );
}
