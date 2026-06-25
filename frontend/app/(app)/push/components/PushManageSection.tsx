type PushManageSectionProps = {
  permission: NotificationPermission;
  loading: boolean;
  pushEnabled: boolean;
  message: string;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
};

export default function PushManageSection({
  permission,
  loading,
  pushEnabled,
  message,
  onEnableNotifications,
  onDisableNotifications,
}: PushManageSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-2xl font-bold">Administrer push</h2>

      <div className="space-y-4 text-gray-600 dark:text-gray-300">
        <p>Når push-notifikationer er aktiveret, kan systemet sende:</p>

        <ul className="list-disc space-y-2 pl-6">
          <li>Nye beskeder</li>
          <li>Direkte vagtbytter</li>
          <li>Åbne vagter i puljen</li>
          <li>Godkendelse af fridage</li>
          <li>Påmindelser om kommende vagter</li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onEnableNotifications}
          disabled={loading || pushEnabled || permission === "denied"}
          className="rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Arbejder..."
            : pushEnabled
              ? "Push er aktiveret"
              : "Aktivér push-notifikationer"}
        </button>

        <button
          onClick={onDisableNotifications}
          disabled={loading || !pushEnabled}
          className="rounded-xl bg-gray-700 px-6 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Deaktivér push-notifikationer
        </button>
      </div>

      {message && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          {message}
        </div>
      )}

      {permission === "denied" && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Browseren har blokeret notifikationer. Du skal manuelt tillade dem
          i browserens indstillinger.
        </div>
      )}
    </section>
  );
}
