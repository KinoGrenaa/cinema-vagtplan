"use client";

import AdminGuard from "@/app/components/access/AdminGuard";
import ScheduleTemplatesPageContent from "./components/layout/ScheduleTemplatesPageContent";
import ScheduleTemplatesPageModals from "./components/layout/ScheduleTemplatesPageModals";
import { useScheduleTemplatePageController } from "./hooks/controllers/useScheduleTemplatePageController";

export default function ScheduleTemplatesPage() {
  const controller = useScheduleTemplatePageController();

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-6 text-gray-950 dark:bg-gray-950 dark:text-white">
        <ScheduleTemplatesPageContent controller={controller} />
        <ScheduleTemplatesPageModals controller={controller} />
      </main>
    </AdminGuard>
  );
}
