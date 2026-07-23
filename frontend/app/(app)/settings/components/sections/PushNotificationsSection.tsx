import {
  Bell,
  BellOff,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

export type PushMessageTone =
  | "success"
  | "warning"
  | "error"
  | "info";

type PushNotificationsSectionProps = {
  permission: NotificationPermission;
  supported: boolean;
  pushEnabled: boolean;
  pushLoading: boolean;
  pushMessage: string;
  pushMessageTone: PushMessageTone;
  isMasterWithoutOwnCinema: boolean;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
};

const MESSAGE_CLASSES: Record<PushMessageTone, string> = {
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200",
  info:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
};

export default function PushNotificationsSection({
  permission,
  supported,
  pushEnabled,
  pushLoading,
  pushMessage,
  pushMessageTone,
  isMasterWithoutOwnCinema,
  onEnableNotifications,
  onDisableNotifications,
}: PushNotificationsSectionProps) {
  const status = !supported
    ? {
        title: "Ikke understøttet",
        text: "Denne browser eller enhed understøtter ikke web-push.",
        icon: (
          <CircleAlert className="h-8 w-8 text-slate-600 dark:text-slate-300" />
        ),
        className:
          "border-slate-300 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
      }
    : permission === "granted" && pushEnabled
      ? {
          title: "Aktiveret",
          text: "Push-notifikationer er aktiveret på denne browser.",
          icon: (
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          ),
          className:
            "border-green-200 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100",
        }
      : permission === "granted"
        ? {
            title: "Tilladelse givet",
            text: "Browseren tillader notifikationer, men push er ikke aktiveret på denne browser.",
            icon: (
              <Bell className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            ),
            className:
              "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100",
          }
        : permission === "denied"
          ? {
              title: "Blokeret",
              text: "Notifikationer er blokeret i browseren.",
              icon: (
                <BellOff className="h-8 w-8 text-red-600 dark:text-red-400" />
              ),
              className:
                "border-red-200 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100",
            }
          : {
              title: "Ikke aktiveret",
              text: "Du har endnu ikke aktiveret push-notifikationer.",
              icon: (
                <Bell className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              ),
              className:
                "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100",
            };

  const enableDisabled =
    pushLoading ||
    pushEnabled ||
    permission === "denied" ||
    !supported ||
    isMasterWithoutOwnCinema;

  const disableDisabled =
    pushLoading ||
    !pushEnabled ||
    !supported ||
    isMasterWithoutOwnCinema;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-2xl font-bold">Push-notifikationer</h2>

      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
        Modtag beskeder om vagter, bytter, fridage og
        systemopdateringer direkte på din enhed.
      </p>

      <div
        className={`mt-5 rounded-xl border p-5 ${status.className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/75 shadow-sm dark:bg-black/20">
            {status.icon}
          </div>

          <div>
            <h3 className="text-lg font-bold">{status.title}</h3>
            <p className="mt-1 text-sm leading-6 opacity-90">
              {status.text}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onEnableNotifications}
          disabled={enableDisabled}
          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700 active:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-500/35 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pushLoading
            ? "Arbejder..."
            : pushEnabled
              ? "Push er aktiveret"
              : "Aktivér push-notifikationer"}
        </button>

        <button
          type="button"
          onClick={onDisableNotifications}
          disabled={disableDisabled}
          className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/35 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600"
        >
          Deaktivér push-notifikationer
        </button>
      </div>

      {pushMessage && (
        <div
          className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${MESSAGE_CLASSES[pushMessageTone]}`}
          role={pushMessageTone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {pushMessage}
        </div>
      )}

      {supported && permission === "denied" && (
        <div
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          Browseren har blokeret notifikationer. Tillad dem manuelt
          i browserens indstillinger, før push kan aktiveres.
        </div>
      )}

      {!supported && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Web-push kræver understøttelse af service workers, Push
          API og browsernotifikationer.
        </div>
      )}

      {isMasterWithoutOwnCinema && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          MASTER-brugere er globale og er ikke tilknyttet en
          konkret biograf. Push kan aktiveres for ADMIN- og
          EMPLOYEE-brugere.
        </div>
      )}
    </section>
  );
}
