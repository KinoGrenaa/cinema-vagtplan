import AppMenu from "../components/AppMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <AppMenu />

      {children}
    </main>
  );
}
