"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

export type CinemaModuleKey =
  | "SCHEDULE"
  | "SHIFT_PLANNING"
  | "TIME_TRACKING"
  | "PAYROLL"
  | "LEAVE"
  | "SHIFT_TRADES"
  | "STAFFING_REQUESTS"
  | "MESSAGES"
  | "EMPLOYEE_DOCUMENTS"
  | "STAFFING_AI";

type CinemaModule = {
  key: CinemaModuleKey;
  name: string;
  enabled: boolean;
};

type CinemaModulesResponse = {
  modules: CinemaModule[];
};

type CinemaModulesContextValue = {
  loading: boolean;
  hasCinemaContext: boolean;
  isModuleEnabled: (
    moduleKey: CinemaModuleKey,
  ) => boolean;
  refreshModules: () => Promise<void>;
};

const CinemaModulesContext =
  createContext<CinemaModulesContextValue | null>(
    null,
  );

const moduleRouteRules: Array<{
  prefix: string;
  moduleKey: CinemaModuleKey;
}> = [
  {
    prefix:
      "/cinema-settings/payroll-types",
    moduleKey: "PAYROLL",
  },
  {
    prefix: "/employee-documents",
    moduleKey:
      "EMPLOYEE_DOCUMENTS",
  },
  {
    prefix: "/shift-planning",
    moduleKey: "SHIFT_PLANNING",
  },
  {
    prefix: "/schedule-templates",
    moduleKey: "SHIFT_PLANNING",
  },
  {
    prefix: "/day-periods",
    moduleKey: "SHIFT_PLANNING",
  },
  {
    prefix: "/job-functions",
    moduleKey: "SHIFT_PLANNING",
  },
  {
    prefix: "/time-approval",
    moduleKey: "TIME_TRACKING",
  },
  {
    prefix: "/my-time",
    moduleKey: "TIME_TRACKING",
  },
  {
    prefix: "/clock",
    moduleKey: "TIME_TRACKING",
  },
  {
    prefix: "/absence-calendar",
    moduleKey: "LEAVE",
  },
  {
    prefix: "/leave-approval",
    moduleKey: "LEAVE",
  },
  {
    prefix: "/leave-requests",
    moduleKey: "LEAVE",
  },
  {
    prefix: "/staffing-requests",
    moduleKey:
      "STAFFING_REQUESTS",
  },
  {
    prefix: "/shift-trades",
    moduleKey: "SHIFT_TRADES",
  },
  {
    prefix: "/messages",
    moduleKey: "MESSAGES",
  },
  {
    prefix: "/payroll",
    moduleKey: "PAYROLL",
  },
  {
    prefix: "/my-shifts",
    moduleKey: "SCHEDULE",
  },
  {
    prefix: "/schedule",
    moduleKey: "SCHEDULE",
  },
];

function pathMatches(
  pathname: string,
  prefix: string,
) {
  return (
    pathname === prefix ||
    pathname.startsWith(
      `${prefix}/`,
    )
  );
}

export function getModuleForPathname(
  pathname: string,
) {
  return (
    moduleRouteRules.find(
      (rule) =>
        pathMatches(
          pathname,
          rule.prefix,
        ),
    )?.moduleKey ?? null
  );
}

function getSelectedMasterCinemaId() {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const cinemaId = Number(
    localStorage.getItem(
      "masterSelectedCinemaId",
    ),
  );

  if (
    !Number.isInteger(cinemaId) ||
    cinemaId <= 0
  ) {
    return null;
  }

  return cinemaId;
}

export function CinemaModulesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { token, user } = useAuth();
  const [
    enabledByKey,
    setEnabledByKey,
  ] = useState<
    Partial<
      Record<
        CinemaModuleKey,
        boolean
      >
    >
  >({});
  const [loading, setLoading] =
    useState(true);
  const [
    contextVersion,
    setContextVersion,
  ] = useState(0);

  const hasCinemaContext =
    Boolean(
      user &&
        (user.role !== "MASTER" ||
          getSelectedMasterCinemaId()),
    );

  const refreshModules =
    useCallback(async () => {
      if (!token || !user) {
        setEnabledByKey({});
        setLoading(false);
        return;
      }

      if (
        user.role === "MASTER" &&
        !getSelectedMasterCinemaId()
      ) {
        setEnabledByKey({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await apiFetch(
          "/cinema-modules/current",
        );

        if (!response.ok) {
          setEnabledByKey({});
          return;
        }

        const data =
          (await response.json()) as CinemaModulesResponse;
        const nextEnabledByKey:
          Partial<
            Record<
              CinemaModuleKey,
              boolean
            >
          > = {};

        for (const module of
          data.modules ?? []) {
          nextEnabledByKey[
            module.key
          ] = module.enabled;
        }

        setEnabledByKey(
          nextEnabledByKey,
        );
      } catch {
        setEnabledByKey({});
      } finally {
        setLoading(false);
      }
    }, [
      token,
      user,
      contextVersion,
    ]);

  useEffect(() => {
    void refreshModules();
  }, [refreshModules]);

  useEffect(() => {
    function handleCinemaContextChange() {
      setContextVersion(
        (current) => current + 1,
      );
    }

    window.addEventListener(
      "masterSelectedCinemaChanged",
      handleCinemaContextChange,
    );
    window.addEventListener(
      "cinemaModulesChanged",
      handleCinemaContextChange,
    );
    window.addEventListener(
      "storage",
      handleCinemaContextChange,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        handleCinemaContextChange,
      );
      window.removeEventListener(
        "cinemaModulesChanged",
        handleCinemaContextChange,
      );
      window.removeEventListener(
        "storage",
        handleCinemaContextChange,
      );
    };
  }, []);

  const isModuleEnabled =
    useCallback(
      (
        moduleKey: CinemaModuleKey,
      ) =>
        enabledByKey[moduleKey] !==
        false,
      [enabledByKey],
    );

  const value = useMemo(
    () => ({
      loading,
      hasCinemaContext,
      isModuleEnabled,
      refreshModules,
    }),
    [
      loading,
      hasCinemaContext,
      isModuleEnabled,
      refreshModules,
    ],
  );

  return (
    <CinemaModulesContext.Provider
      value={value}
    >
      {children}
    </CinemaModulesContext.Provider>
  );
}

export function useCinemaModules() {
  const context = useContext(
    CinemaModulesContext,
  );

  if (!context) {
    throw new Error(
      "useCinemaModules skal bruges inde i CinemaModulesProvider",
    );
  }

  return context;
}

export function CinemaModuleRouteGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    loading,
    hasCinemaContext,
    isModuleEnabled,
  } = useCinemaModules();
  const requiredModule =
    getModuleForPathname(pathname);

  if (!requiredModule) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Kontrollerer moduladgang...
        </div>
      </main>
    );
  }

  if (
    hasCinemaContext &&
    !isModuleEnabled(requiredModule)
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <h1 className="text-2xl font-bold">
            Modulet er ikke aktivt
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Denne funktion er
            deaktiveret for den aktive
            biograf.
          </p>
          <Link
            href={
              user?.role === "MASTER"
                ? "/master"
                : "/dashboard"
            }
            className="mt-5 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Gå tilbage
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
