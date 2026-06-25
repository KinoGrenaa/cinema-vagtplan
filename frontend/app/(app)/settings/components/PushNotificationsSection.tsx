import { Bell, BellOff, CheckCircle2 } from "lucide-react";

type PushNotificationsSectionProps = {
  permission: NotificationPermission;
  pushEnabled: boolean;
  pushLoading: boolean;
  pushMessage: string;
  isMasterWithoutOwnCinema: boolean;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
};

export default function PushNotificationsSection({
  permission,
  pushEnabled,
  pushLoading,
  pushMessage,
  isMasterWithoutOwnCinema,
  onEnableNotifications,
  onDisableNotifications,
}: PushNotificationsSectionProps) {
  function getPushStatus() {
    if (permission === "granted" && pushEnabled) {
      return {
        title: "Aktiveret",
        text: "Push-notifikationer er aktiveret på denne browser.",
        icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
        className:
          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
      };
    }

    if (permission === "granted" && !pushEnabled) {
      return {
        title: "Tilladelse givet",
        text: "Browseren tillader notifikationer, men push er ikke aktiveret på denne browser.",
        icon: <Bell className="h-8 w-8 text-yellow-600" />,
        className:
          "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
      };
    }

    if (permission === "denied") {
      return {
        title: "Blokeret",
        text: "Notifikationer er blokeret i browseren.",
        icon: <BellOff className="h-8 w-8 text-red-600" />,
        className:
          "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
      };
    }

    return {
      title: "Ikke aktiveret",
      text: "Du har endnu ikke aktiveret push-notifikationer.",
      icon: <Bell className="h-8 w-8 text-yellow-600" />,
      className:
        "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40",
    };
  }

  const pushStatus = getPushStatus();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-center gap-3">
        <Bell className="h-6 w-6" />

        <div>
          <h2 className="text-2xl font-bold">Push-notifikationer</h2>

          <p className="text-gray-500 dark:text-gray-400">
            Modtag beskeder om vagter og systemopdateringer direkte på din
            enhed.
          </p>
        </div>
      </div>

      <div className={`mb-6 rounded-2xl border p-4 ${pushStatus.className}`}>
        <div className="flex items-center gap-4">
          {pushStatus.icon}

          <div>
            <div className="font-bold">{pushStatus.title}</div>

            <div className="text-sm text-gray-600 dark:text-gray-300">
              {pushStatus.text}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onEnableNotifications}
          disabled={
            pushLoading ||
            pushEnabled ||
            permission === "denied" ||
            isMasterWithoutOwnCinema
          }
          className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pushLoading
            ? "Arbejder..."
            : pushEnabled
              ? "Push er aktiveret"
              : "Aktivér push-notifikationer"}
        </button>

        <button
          onClick={onDisableNotifications}
          disabled={pushLoading || !pushEnabled}
          className="rounded-xl bg-gray-700 px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Deaktivér push-notifikationer
        </button>
      </div>

      {pushMessage && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          {pushMessage}
        </div>
      )}

      {permission === "denied" && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Browseren har blokeret notifikationer. Du skal manuelt tillade dem i
          browserens indstillinger.
        </div>
      )}
      {isMasterWithoutOwnCinema && (
        <div className="mt-5 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
          MASTER-brugere er globale og er ikke tilknyttet en konkret biograf.
          Push-notifikationer kan aktiveres for almindelige biografbrugere.
        </div>
      )}
    </section>
  );
}
