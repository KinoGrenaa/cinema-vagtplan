import type { PushStatus } from "../../helpers/core/pushHelpers";

type PushStatusSectionProps = {
  status: PushStatus;
};

export default function PushStatusSection({ status }: PushStatusSectionProps) {
  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm transition-colors ${status.className}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div>{status.icon}</div>

        <div>
          <h2 className="text-2xl font-bold">{status.title}</h2>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {status.text}
          </p>
        </div>
      </div>
    </section>
  );
}
