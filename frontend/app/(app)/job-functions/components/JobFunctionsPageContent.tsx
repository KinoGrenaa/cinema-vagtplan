import type { ComponentProps } from "react";

import JobFunctionsMasterCinemaRequired from "./JobFunctionsMasterCinemaRequired";
import JobFunctionsOverviewSection from "./JobFunctionsOverviewSection";
import JobFunctionsPageHeader from "./JobFunctionsPageHeader";

type JobFunctionsPageContentProps = {
  needsMasterCinemaSelection: boolean;
  overviewProps: ComponentProps<typeof JobFunctionsOverviewSection>;
};

export default function JobFunctionsPageContent({
  needsMasterCinemaSelection,
  overviewProps,
}: JobFunctionsPageContentProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <JobFunctionsPageHeader />

        {needsMasterCinemaSelection && <JobFunctionsMasterCinemaRequired />}

        {!needsMasterCinemaSelection && (
          <JobFunctionsOverviewSection {...overviewProps} />
        )}
      </div>
    </main>
  );
}
