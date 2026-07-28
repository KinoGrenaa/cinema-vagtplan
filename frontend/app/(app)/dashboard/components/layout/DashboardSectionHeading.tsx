import type { ReactNode } from "react";

type DashboardSectionHeadingProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function DashboardSectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: DashboardSectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="mt-1 text-2xl font-bold text-gray-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
