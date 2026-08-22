import type { ReactNode } from "react";

type CinemaSettingsGroupProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function CinemaSettingsGroup({
  title,
  description,
  children,
}: CinemaSettingsGroupProps) {
  return (
    <section className="space-y-4">
      <header className="border-b border-slate-300 pb-4 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white md:text-2xl">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </header>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}
