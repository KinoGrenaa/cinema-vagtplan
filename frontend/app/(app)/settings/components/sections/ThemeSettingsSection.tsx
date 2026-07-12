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
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-center gap-3">
        {theme === "dark" ? (
          <Moon className="h-6 w-6" />
        ) : (
          <Sun className="h-6 w-6" />
        )}

        <div>
          <h2 className="text-2xl font-bold">Tema</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Vælg mellem lyst og mørkt tema.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setTheme("light")}
          className={`rounded-xl px-5 py-3 font-medium transition ${
            theme === "light"
              ? "bg-yellow-500 text-white"
              : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
          }`}
        >
          Lyst tema
        </button>

        <button
          onClick={() => setTheme("dark")}
          className={`rounded-xl px-5 py-3 font-medium transition ${
            theme === "dark"
              ? "bg-gray-900 text-white dark:bg-white dark:text-black"
              : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
          }`}
        >
          Mørkt tema
        </button>
      </div>
    </section>
  );
}
