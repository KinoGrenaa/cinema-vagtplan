"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";

import ShiftTradesHeader from "./components/layout/ShiftTradesHeader";
import ShiftTradeTargetNotice from "./components/layout/ShiftTradeTargetNotice";
import ShiftTradesHistorySection from "./components/list/ShiftTradesHistorySection";
import ShiftTradesOpenSection from "./components/list/ShiftTradesOpenSection";
import {
  parseShiftTradeTarget,
  type ShiftTradeTargetState,
} from "./helpers/core/shiftTradeTarget";
import {
  useShiftTradeActions,
} from "./hooks/actions/useShiftTradeActions";
import {
  useShiftTradesData,
} from "./hooks/data/useShiftTradesData";

export default function ShiftTradesPage() {
  const confirmModal =
    useConfirm();
  const infoDialog =
    useInfoModal();
  const pathname =
    usePathname();
  const router =
    useRouter();
  const searchParams =
    useSearchParams();
  const focusedTradeRef =
    useRef<number | null>(
      null,
    );
  const tradeTarget =
    parseShiftTradeTarget(
      searchParams.get(
        "tradeId",
      ),
    );

  const {
    user,
    apiFetch,
    loading,
    loadingMoreHistory,
    message,
    setMessage,
    fetchTrades,
    loadMoreHistory,
    directTrades,
    poolTrades,
    historyTrades,
    historyTotalCount,
    historyHasMore,
    hasShiftConflict,
    needsMasterCinemaSelection,
  } = useShiftTradesData({
    infoDialog,
    targetTradeId:
      tradeTarget.tradeId,
  });

  const {
    acceptTrade,
    rejectTrade,
  } = useShiftTradeActions({
    apiFetch,
    user,
    confirmModal,
    infoDialog,
    fetchTrades,
    setMessage,
  });

  const visibleTradeIds =
    useMemo(
      () =>
        new Set(
          [
            ...directTrades,
            ...poolTrades,
            ...historyTrades,
          ].map(
            (trade) =>
              trade.id,
          ),
        ),
      [
        directTrades,
        historyTrades,
        poolTrades,
      ],
    );
  const targetState:
    ShiftTradeTargetState =
      tradeTarget.invalid
        ? "invalid"
        : !tradeTarget.tradeId
          ? "idle"
          : loading
            ? "loading"
            : visibleTradeIds.has(
                  tradeTarget.tradeId,
                )
              ? "found"
              : "missing";

  useEffect(() => {
    const tradeId =
      tradeTarget.tradeId;

    if (
      !tradeId ||
      targetState !==
        "found"
    ) {
      focusedTradeRef.current =
        null;
      return;
    }

    if (
      focusedTradeRef.current ===
      tradeId
    ) {
      return;
    }

    focusedTradeRef.current =
      tradeId;

    const timeoutId =
      window.setTimeout(() => {
        const element =
          document.getElementById(
            `shift-trade-${tradeId}`,
          );

        if (!element) {
          return;
        }

        element.focus({
          preventScroll: true,
        });

        const reduceMotion =
          window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;

        element.scrollIntoView({
          behavior:
            reduceMotion
              ? "auto"
              : "smooth",
          block: "center",
        });
      }, 100);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    targetState,
    tradeTarget.tradeId,
  ]);

  const clearTradeTarget =
    useCallback(() => {
      const params =
        new URLSearchParams(
          searchParams.toString(),
        );

      params.delete(
        "tradeId",
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

      focusedTradeRef.current =
        null;
    }, [
      pathname,
      router,
      searchParams,
    ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-8">
        <div
          className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 dark:border-blue-950 dark:border-t-blue-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                Henter vagtbytter
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Vagtpuljen, dine
                direkte tilbud og
                den nyeste historik
                indlæses.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (
    needsMasterCinemaSelection
  ) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-8">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/35">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Ingen aktiv biograf
              valgt
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
              Vælg en biograf for at
              se vagtpuljen
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-300">
              Som MASTER skal du vælge
              en aktiv biograf, før
              vagtbytter kan vises
              eller behandles.
            </p>
            <Link
              href="/master"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
            >
              Vælg biograf
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <ShiftTradesHeader
            message={message}
          />

          <ShiftTradeTargetNotice
            state={targetState}
            tradeId={
              tradeTarget.tradeId
            }
            onClear={
              clearTradeTarget
            }
          />

          <ShiftTradesOpenSection
            title="Direkte tilbud"
            trades={directTrades}
            emptyText="Du har ingen direkte vagtbytter lige nu."
            onAccept={
              acceptTrade
            }
            onReject={
              rejectTrade
            }
            hasShiftConflict={
              hasShiftConflict
            }
            focusedTradeId={
              tradeTarget.tradeId
            }
          />

          <ShiftTradesOpenSection
            title="Åbne vagter i puljen"
            trades={poolTrades}
            emptyText="Der er ingen åbne vagter i vagtpuljen lige nu."
            onAccept={
              acceptTrade
            }
            hasShiftConflict={
              hasShiftConflict
            }
            focusedTradeId={
              tradeTarget.tradeId
            }
          />

          <ShiftTradesHistorySection
            trades={
              historyTrades
            }
            totalCount={
              historyTotalCount
            }
            hasMore={
              historyHasMore
            }
            loadingMore={
              loadingMoreHistory
            }
            onLoadMore={
              loadMoreHistory
            }
            focusedTradeId={
              tradeTarget.tradeId
            }
          />
        </div>
      </main>

      <ConfirmModal
        open={
          confirmModal.open
        }
        title={
          confirmModal.title
        }
        description={
          confirmModal.description
        }
        confirmText={
          confirmModal.confirmText
        }
        cancelText={
          confirmModal.cancelText
        }
        confirmVariant={
          confirmModal.confirmVariant
        }
        loading={
          confirmModal.loading
        }
        onConfirm={
          confirmModal.handleConfirm
        }
        onCancel={
          confirmModal.handleCancel
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
    </>
  );
}
