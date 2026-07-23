import { Moon, Sun } from "lucide-react";

type ThemeSettingsSectionProps = {
  theme: string;
  setTheme: (theme: "light" | "dark") => void;
};

export default function ThemeSettingsSection({
  theme,
  setTheme,
}: ThemeSettingsSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
          {theme === "dark" ? (
            <Moon aria-hidden="true" />
          ) : (
            <Sun aria-hidden="true" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold">Tema</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Vælg mellem lyst og mørkt tema.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={theme === "light"}
          className={`rounded-xl border px-5 py-4 text-left font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/35 ${
            theme === "light"
              ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600"
          }`}
        >
          <span className="flex items-center gap-3">
            <Sun aria-hidden="true" />
            Lyst tema
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`rounded-xl border px-5 py-4 text-left font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/35 ${
            theme === "dark"
              ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600"
          }`}
        >
          <span className="flex items-center gap-3">
            <Moon aria-hidden="true" />
            Mørkt tema
          </span>
        </button>
      </div>
    </section>
  );
}
