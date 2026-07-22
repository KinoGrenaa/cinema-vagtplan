import AppMenu from "../components/AppMenu";
import ActiveCinemaIndicator from "../components/cinema/ActiveCinemaIndicator";
import {
  CinemaModuleRouteGate,
  CinemaModulesProvider,
} from "../providers/CinemaModulesProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CinemaModulesProvider>
      <div className="bg-gray-100 pb-3 pt-2 dark:bg-gray-950">
        <AppMenu />
        <ActiveCinemaIndicator />
      </div>

      <CinemaModuleRouteGate>
        {children}
      </CinemaModuleRouteGate>
    </CinemaModulesProvider>
  );
}
