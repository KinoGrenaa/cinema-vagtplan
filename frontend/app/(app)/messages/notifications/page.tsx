"use client";

import NotificationsPage from "./NotificationsPage";
import MessagesWorkspaceNav from "../components/layout/MessagesWorkspaceNav";

export default function MessageNotificationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-950 transition-colors dark:bg-[#030712] dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
            <MessagesWorkspaceNav
              active="notifications"
            />
            <div className="min-w-0 bg-slate-50 dark:bg-[#030712]">
              <NotificationsPage />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
