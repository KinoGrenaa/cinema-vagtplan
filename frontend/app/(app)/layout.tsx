import AppMenu from "../components/AppMenu";
import ActiveCinemaIndicator from "../components/ActiveCinemaIndicator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppMenu />
      <ActiveCinemaIndicator />
      {children}
    </>
  );
}
