"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import { ColleaguesHeader } from "./components/ColleaguesHeader";
import { ColleaguesList } from "./components/ColleaguesList";
import { useColleaguesPage } from "./hooks/useColleaguesPage";

export default function ColleaguesPage() {
  const { users, infoDialog } = useColleaguesPage();

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="bg-white rounded-xl shadow p-6">
          <ColleaguesHeader />
          <ColleaguesList users={users} />
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
