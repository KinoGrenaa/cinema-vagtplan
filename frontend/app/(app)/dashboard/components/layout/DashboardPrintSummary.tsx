import {
  getDashboardSourceLabel,
} from "../../helpers/dashboardSourcePresentation";
import type {
  DashboardSnapshot,
  DashboardSnapshotMetric,
  DashboardSnapshotTask,
} from "../../helpers/dashboardSnapshot";
import type { DashboardSourceKey } from "../../types";

type DashboardPrintSummaryProps = {
  snapshot: DashboardSnapshot;
};

const SOURCE_LABELS: Record<DashboardSourceKey, string> = {
  shifts: "Vagtplan",
  timeEntries: "Tidsregistreringer",
  leaveRequests: "Fravær",
  shiftTrades: "Vagtbytter",
  movies: "Filmprogram",
};

function sourceLabel(sourceKeys: DashboardSourceKey[]) {
  return sourceKeys.map((key) => SOURCE_LABELS[key]).join(" + ");
}

function DataTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<DashboardSnapshotMetric | DashboardSnapshotTask>;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-b border-gray-400 pb-1 text-lg font-bold">
        {title}
      </h2>
      <table className="mt-2 w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border-b border-gray-300 py-1 pr-4">Punkt</th>
            <th className="border-b border-gray-300 py-1 pr-4">Værdi</th>
            <th className="border-b border-gray-300 py-1">Datakilde</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.label}`}>
              <td className="border-b border-gray-200 py-1 pr-4">
                {row.label}
              </td>
              <td className="border-b border-gray-200 py-1 pr-4 font-semibold">
                {row.value}
              </td>
              <td className="border-b border-gray-200 py-1">
                {sourceLabel(row.sourceKeys)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TextList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="border-b border-gray-400 pb-1 text-lg font-bold">
        {title}
      </h2>
      {items.length > 0 ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {items.map((item, index) => (
            <li key={`${title}-${index}-${item}`}>{item}</li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm">{emptyText}</p>
      )}
    </section>
  );
}

export default function DashboardPrintSummary({
  snapshot,
}: DashboardPrintSummaryProps) {
  const sourceEntries = Object.entries(snapshot.sourceStatus) as Array<
    [DashboardSourceKey, DashboardSnapshot["sourceStatus"][DashboardSourceKey]]
  >;

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          [data-dashboard-print-root],
          [data-dashboard-print-root] * {
            visibility: visible !important;
          }

          [data-dashboard-print-root] {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            color: #111827;
            background: white;
          }
        }
      `}</style>
      <article
        data-dashboard-print-root
        className="hidden bg-white text-gray-950 print:block"
      >
        <header className="border-b-2 border-gray-900 pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide">
            Driftsrapport
          </p>
          <h1 className="mt-1 text-3xl font-bold">{snapshot.dateLabel}</h1>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <p>Genereret: {snapshot.generatedAtLabel}</p>
            <p>Visning: {snapshot.viewLabel}</p>
            <p>Bruger: {snapshot.userLabel}</p>
            <p>Rolle: {snapshot.roleLabel}</p>
          </div>
        </header>

        <DataTable title="Nøgletal" rows={snapshot.metrics} />
        <DataTable title="Åbne opgaver" rows={snapshot.tasks} />
        <TextList
          title="Bemandingsforhold"
          items={snapshot.staffingWarnings}
          emptyText="Ingen kendte bemandingsadvarsler."
        />
        <TextList
          title="Beregnet belastning"
          items={snapshot.predictiveStaffing}
          emptyText="Ingen beregnede belastningspunkter."
        />
        <TextList
          title="Automatiske anbefalinger"
          items={snapshot.recommendations}
          emptyText="Ingen automatiske anbefalinger."
        />

        <section className="mt-6 break-inside-avoid">
          <h2 className="border-b border-gray-400 pb-1 text-lg font-bold">
            Datakilder
          </h2>
          <table className="mt-2 w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-gray-300 py-1 pr-4">Kilde</th>
                <th className="border-b border-gray-300 py-1 pr-4">Status</th>
                <th className="border-b border-gray-300 py-1">Bemærkning</th>
              </tr>
            </thead>
            <tbody>
              {sourceEntries.map(([key, status]) => (
                <tr key={key}>
                  <td className="border-b border-gray-200 py-1 pr-4">
                    {SOURCE_LABELS[key]}
                  </td>
                  <td className="border-b border-gray-200 py-1 pr-4 font-semibold">
                    {getDashboardSourceLabel(status.state)}
                  </td>
                  <td className="border-b border-gray-200 py-1">
                    {status.message?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-8 border-t border-gray-400 pt-3 text-xs text-gray-600">
          Rapporten er et øjebliksbillede af dashboardets data. Regelbaserede vurderinger erstatter ikke manuel kontrol af vagtplan og filmprogram.
        </footer>
      </article>
    </>
  );
}
